package model

import (
	"errors"
	"net"
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
	DisplayStatus string `json:"display_status" gorm:"-"`
}

type RegistrationIPEvent struct {
	Id        int    `json:"id"`
	IP        string `json:"ip" gorm:"type:varchar(45);index:idx_registration_ip_created,priority:1"`
	UserID    int    `json:"user_id"`
	CreatedAt int64  `json:"created_at" gorm:"bigint;index:idx_registration_ip_created,priority:2"`
}

func normalizeIP(ip string) (string, error) {
	parsed := net.ParseIP(strings.TrimSpace(ip))
	if parsed == nil {
		return "", errors.New("invalid IP address")
	}
	return parsed.String(), nil
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

func UpsertIPBan(ip, reason, source string, expiresAt int64) (*IPBan, error) {
	normalized, err := normalizeIP(ip)
	if err != nil {
		return nil, err
	}
	if source != IPBanSourceAuto {
		source = IPBanSourceManual
	}
	now := time.Now().Unix()
	var ban IPBan
	err = DB.Where("ip = ?", normalized).First(&ban).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		ban = IPBan{IP: normalized, Reason: strings.TrimSpace(reason), Source: source, Status: IPBanStatusActive, ExpiresAt: expiresAt, CreatedAt: now, UpdatedAt: now}
		return &ban, DB.Create(&ban).Error
	}
	if err != nil {
		return nil, err
	}
	ban.Reason = strings.TrimSpace(reason)
	ban.Source = source
	ban.Status = IPBanStatusActive
	ban.ExpiresAt = expiresAt
	ban.ReleasedAt = 0
	ban.ReleasedBy = 0
	ban.UpdatedAt = now
	return &ban, DB.Save(&ban).Error
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
	normalized, err := normalizeIP(ip)
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
	if err := DB.Create(&RegistrationIPEvent{IP: normalized, UserID: userID, CreatedAt: now}).Error; err != nil {
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
	_, err = UpsertIPBan(normalized, "automatic registration abuse threshold exceeded", IPBanSourceAuto, expiresAt)
	return true, err
}
