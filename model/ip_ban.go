package model

import (
	"errors"
	"net"
	"net/netip"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	IPBanStatusActive   = 1
	IPBanStatusReleased = 2
	IPBanSourceManual   = "manual"
	IPBanSourceAuto     = "automatic"
)

type IPBan struct {
	Id            int    `json:"id"`
	IP            string `json:"ip" gorm:"type:varchar(45);uniqueIndex"`
	Reason        string `json:"reason" gorm:"type:varchar(255)"`
	Source        string `json:"source" gorm:"type:varchar(20);index"`
	Status        int    `json:"status" gorm:"index"`
	ExpiresAt     int64  `json:"expires_at" gorm:"bigint;index"`
	CreatedAt     int64  `json:"created_at" gorm:"bigint;index"`
	UpdatedAt     int64  `json:"updated_at" gorm:"bigint"`
	ReleasedAt    int64  `json:"released_at,omitempty" gorm:"bigint"`
	ReleasedBy    int    `json:"released_by,omitempty"`
	BlockOutbound bool   `json:"block_outbound"`
	DisplayStatus string `json:"display_status" gorm:"-"`
}

type RegistrationIPEvent struct {
	Id        int    `json:"id"`
	IP        string `json:"ip" gorm:"type:varchar(45);index:idx_registration_ip_created,priority:1"`
	Network   string `json:"network" gorm:"type:varchar(64);index:idx_registration_network_created,priority:1"`
	ASN       uint32 `json:"asn" gorm:"type:bigint;index:idx_registration_asn_created,priority:1"`
	UserID    int    `json:"user_id"`
	Source    string `json:"source" gorm:"type:varchar(20)"`
	CreatedAt int64  `json:"created_at" gorm:"bigint;index:idx_registration_ip_created,priority:2;index:idx_registration_network_created,priority:2;index:idx_registration_asn_created,priority:2"`
}

func normalizeIP(ip string) (string, error) {
	parsed := net.ParseIP(strings.TrimSpace(ip))
	if parsed == nil {
		return "", errors.New("invalid IP address")
	}
	return parsed.String(), nil
}

func registrationIdentity(ip string) (normalized string, network string, asn uint32, err error) {
	normalized, err = normalizeIP(ip)
	if err != nil {
		return "", "", 0, err
	}
	address, err := netip.ParseAddr(normalized)
	if err != nil {
		return "", "", 0, err
	}
	address = address.Unmap()
	prefixBits := 48
	if address.Is4() {
		prefixBits = 24
	}
	network = netip.PrefixFrom(address, prefixBits).Masked().String()
	asn, _ = common.LookupASN(normalized)
	return normalized, network, asn, nil
}

// IsRegistrationBlocked checks every locally available registration identity:
// exact IP, IPv4 /24 or IPv6 /48 network, and optional ASN data.
func IsRegistrationBlocked(ip string) (bool, error) {
	banned, err := IsIPBanned(ip)
	if err != nil || banned {
		return banned, err
	}
	setting, err := GetRegistrationProtectionSetting()
	if err != nil {
		return false, err
	}
	if setting.Enabled != RegistrationProtectionEnabled {
		return false, nil
	}
	normalized, network, asn, err := registrationIdentity(ip)
	if err != nil {
		return false, err
	}
	if registrationASNBlocked(setting.BlockedASNs, asn) {
		return true, nil
	}
	since := common.GetTimestamp() - int64(setting.WindowHours)*3600
	checks := []struct {
		column    string
		value     interface{}
		threshold int
	}{
		{column: "ip", value: normalized, threshold: setting.Threshold},
		{column: "network", value: network, threshold: setting.SubnetThreshold},
	}
	if asn != 0 {
		checks = append(checks, struct {
			column    string
			value     interface{}
			threshold int
		}{column: "asn", value: asn, threshold: setting.ASNThreshold})
	}
	for _, check := range checks {
		if check.threshold <= 0 {
			continue
		}
		var count int64
		if err := DB.Model(&RegistrationIPEvent{}).
			Where(check.column+" = ? AND created_at >= ?", check.value, since).
			Count(&count).Error; err != nil {
			return false, err
		}
		if count >= int64(check.threshold) {
			return true, nil
		}
	}
	return false, nil
}

func IsIPBanned(ip string) (bool, error) {
	normalized, err := normalizeIP(ip)
	if err != nil {
		return false, err
	}
	var ban IPBan
	err = DB.Where("ip = ? AND status = ? AND (expires_at = 0 OR expires_at > ?)", normalized, IPBanStatusActive, common.GetTimestamp()).First(&ban).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	return err == nil, err
}

func ListActiveOutboundBlockedIPs() ([]string, error) {
	var ips []string
	err := DB.Model(&IPBan{}).
		Where("block_outbound = ? AND status = ? AND (expires_at = 0 OR expires_at > ?)", true, IPBanStatusActive, common.GetTimestamp()).
		Pluck("ip", &ips).Error
	return ips, err
}
func ListIPBans(startIdx, limit int, keyword string) ([]*IPBan, int64, error) {
	query := DB.Model(&IPBan{})
	if keyword = strings.TrimSpace(keyword); keyword != "" {
		normalized, err := normalizeIP(keyword)
		if err == nil {
			query = query.Where("ip = ?", normalized)
		} else {
			query = query.Where("reason LIKE ?", keyword+"%")
		}
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var bans []*IPBan
	if err := query.Order("id desc").Limit(limit).Offset(startIdx).Find(&bans).Error; err != nil {
		return nil, 0, err
	}
	now := common.GetTimestamp()
	for _, ban := range bans {
		if ban.Status == IPBanStatusActive && (ban.ExpiresAt == 0 || ban.ExpiresAt > now) {
			ban.DisplayStatus = "active"
		} else if ban.Status == IPBanStatusActive {
			ban.DisplayStatus = "expired"
		} else {
			ban.DisplayStatus = "released"
		}
	}
	return bans, total, nil
}

func UpsertIPBan(ip, reason, source string, expiresAt int64, blockOutbound bool) (*IPBan, error) {
	return upsertIPBanWithTx(DB, ip, reason, source, expiresAt, blockOutbound)
}

func upsertIPBanWithTx(tx *gorm.DB, ip, reason, source string, expiresAt int64, blockOutbound bool) (*IPBan, error) {
	normalized, err := normalizeIP(ip)
	if err != nil {
		return nil, err
	}
	if source != IPBanSourceAuto {
		source = IPBanSourceManual
	}
	now := time.Now().Unix()
	var ban IPBan
	err = tx.Where("ip = ?", normalized).First(&ban).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		ban = IPBan{IP: normalized, Reason: strings.TrimSpace(reason), Source: source, Status: IPBanStatusActive, ExpiresAt: expiresAt, BlockOutbound: blockOutbound, CreatedAt: now, UpdatedAt: now}
		return &ban, tx.Create(&ban).Error
	}
	if err != nil {
		return nil, err
	}
	ban.Reason = strings.TrimSpace(reason)
	ban.Source = source
	ban.Status = IPBanStatusActive
	ban.ExpiresAt = expiresAt
	ban.BlockOutbound = blockOutbound
	ban.ReleasedAt = 0
	ban.ReleasedBy = 0
	ban.UpdatedAt = now
	return &ban, tx.Save(&ban).Error
}

func ReleaseIPBan(id, releasedBy int) error {
	result := DB.Model(&IPBan{}).Where("id = ? AND status = ?", id, IPBanStatusActive).Updates(map[string]interface{}{
		"status": IPBanStatusReleased, "released_at": common.GetTimestamp(), "released_by": releasedBy, "updated_at": common.GetTimestamp(),
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func RecordRegistrationIP(ip string, userID int) (bool, error) {
	return RecordRegistration(ip, userID, "password")
}

func RecordRegistration(ip string, userID int, source string) (bool, error) {
	normalized, network, asn, err := registrationIdentity(ip)
	if err != nil {
		return false, err
	}
	now := common.GetTimestamp()
	setting, err := GetRegistrationProtectionSetting()
	if err != nil {
		return false, err
	}
	if setting.Enabled != RegistrationProtectionEnabled {
		return false, nil
	}
	windowSeconds := int64(setting.WindowHours) * 3600
	threshold := setting.Threshold
	source = strings.TrimSpace(source)
	if len(source) > 20 {
		source = source[:20]
	}
	if err := DB.Create(&RegistrationIPEvent{
		IP: normalized, Network: network, ASN: asn, UserID: userID, Source: source, CreatedAt: now,
	}).Error; err != nil {
		return false, err
	}
	DB.Where("created_at < ?", now-windowSeconds).Delete(&RegistrationIPEvent{})
	var count int64
	if err := DB.Model(&RegistrationIPEvent{}).Where("ip = ? AND created_at >= ?", normalized, now-windowSeconds).Count(&count).Error; err != nil {
		return false, err
	}
	if count < int64(threshold) {
		return false, nil
	}
	expiresAt := int64(0)
	if setting.DurationHours > 0 {
		expiresAt = now + int64(setting.DurationHours)*3600
	}
	_, err = UpsertIPBan(normalized, "automatic registration abuse threshold exceeded", IPBanSourceAuto, expiresAt, false)
	return true, err
}
