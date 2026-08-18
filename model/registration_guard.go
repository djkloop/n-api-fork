package model

import (
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrRegistrationBlocked = errors.New("registration blocked")

type RegistrationGuardLock struct {
	Id        int64  `json:"id" gorm:"primaryKey"`
	Dimension string `json:"dimension" gorm:"type:varchar(16);not null;uniqueIndex:idx_registration_guard_dimension,priority:1"`
	Value     string `json:"value" gorm:"type:varchar(64);not null;uniqueIndex:idx_registration_guard_dimension,priority:2"`
	UpdatedAt int64  `json:"updated_at" gorm:"bigint"`
}

type registrationDimension struct {
	name       string
	lockValue  string
	eventValue interface{}
	threshold  int
}

const registrationGuardLockStripes = 4096

func registrationLockStripe(value string) string {
	sum := sha256.Sum256([]byte(value))
	stripe := binary.BigEndian.Uint32(sum[:4]) % registrationGuardLockStripes
	return strconv.FormatUint(uint64(stripe), 10)
}

func lockRegistrationDimension(tx *gorm.DB, dimension registrationDimension) error {
	guardLock := RegistrationGuardLock{
		Dimension: dimension.name,
		Value:     dimension.lockValue,
		UpdatedAt: common.GetTimestamp(),
	}
	if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&guardLock).Error; err != nil {
		return err
	}
	return lockForUpdate(tx).
		Where("dimension = ? AND value = ?", dimension.name, dimension.lockValue).
		First(&guardLock).Error
}

func registrationDimensionCount(tx *gorm.DB, dimension registrationDimension, since int64) (int64, error) {
	var count int64
	if err := tx.Model(&RegistrationIPEvent{}).
		Where(dimension.name+" = ? AND created_at >= ?", dimension.eventValue, since).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func registrationIPBanBlockedWithTx(tx *gorm.DB, normalizedIP string, now int64) (bool, error) {
	var activeBan IPBan
	err := lockForUpdate(tx).
		Where("ip = ? AND status = ? AND (expires_at = 0 OR expires_at > ?)", normalizedIP, IPBanStatusActive, now).
		First(&activeBan).Error
	if err == nil {
		return true, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	return false, err
}

// CreateRegisteredUser serializes registration decisions for the exact IP,
// subnet, and optional ASN. User creation and the successful registration event
// commit in one transaction, so concurrent requests cannot overrun a threshold.
func CreateRegisteredUser(ip, source string, create func(tx *gorm.DB) (int, error)) error {
	if create == nil {
		return errors.New("registration create callback is required")
	}
	normalized, network, asn, err := registrationIdentity(ip)
	if err != nil {
		return err
	}
	setting, err := GetRegistrationProtectionSetting()
	if err != nil {
		return err
	}
	now := common.GetTimestamp()
	since := now - int64(setting.WindowHours)*3600
	source = strings.TrimSpace(source)
	if len(source) > 20 {
		source = source[:20]
	}

	err = DB.Transaction(func(tx *gorm.DB) error {
		if setting.Enabled != RegistrationProtectionEnabled {
			blocked, err := registrationIPBanBlockedWithTx(tx, normalized, now)
			if err != nil {
				return err
			}
			if blocked {
				return fmt.Errorf("%w: ip_ban", ErrRegistrationBlocked)
			}
			_, err = create(tx)
			return err
		}
		if registrationASNBlocked(setting.BlockedASNs, asn) {
			return fmt.Errorf("%w: blocked_asn", ErrRegistrationBlocked)
		}

		dimensions := []registrationDimension{
			{name: "ip", lockValue: registrationLockStripe(normalized), eventValue: normalized, threshold: setting.Threshold},
			{name: "network", lockValue: registrationLockStripe(network), eventValue: network, threshold: setting.SubnetThreshold},
		}
		if asn != 0 {
			dimensions = append(dimensions, registrationDimension{
				name: "asn", lockValue: registrationLockStripe(fmt.Sprintf("%d", asn)), eventValue: asn, threshold: setting.ASNThreshold,
			})
		}
		for _, dimension := range dimensions {
			if dimension.threshold <= 0 {
				continue
			}
			if err := lockRegistrationDimension(tx, dimension); err != nil {
				return err
			}
		}
		blocked, err := registrationIPBanBlockedWithTx(tx, normalized, now)
		if err != nil {
			return err
		}
		if blocked {
			return fmt.Errorf("%w: ip_ban", ErrRegistrationBlocked)
		}
		// Do not establish a REPEATABLE READ snapshot until every shared
		// dimension lock has been acquired. A waiter must see the event committed
		// by the transaction that previously held its subnet or ASN lock.
		for _, dimension := range dimensions {
			if dimension.threshold <= 0 {
				continue
			}
			count, err := registrationDimensionCount(tx, dimension, since)
			if err != nil {
				return err
			}
			if count >= int64(dimension.threshold) {
				return fmt.Errorf("%w: %s_threshold", ErrRegistrationBlocked, dimension.name)
			}
		}

		userID, err := create(tx)
		if err != nil {
			return err
		}
		if userID <= 0 {
			return errors.New("registration callback returned an invalid user id")
		}
		if err := tx.Create(&RegistrationIPEvent{
			IP: normalized, Network: network, ASN: asn, UserID: userID, Source: source, CreatedAt: now,
		}).Error; err != nil {
			return err
		}

		if setting.Threshold > 0 {
			exactDimension := dimensions[0]
			count, err := registrationDimensionCount(tx, exactDimension, since)
			if err != nil {
				return err
			}
			if count >= int64(setting.Threshold) {
				expiresAt := int64(0)
				if setting.DurationHours > 0 {
					expiresAt = now + int64(setting.DurationHours)*3600
				}
				if _, err := upsertIPBanWithTx(tx, normalized, "automatic registration abuse threshold exceeded", IPBanSourceAuto, expiresAt, false); err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err == nil && setting.Enabled == RegistrationProtectionEnabled {
		DB.Where("created_at < ?", since).Delete(&RegistrationIPEvent{})
	}
	return err
}
