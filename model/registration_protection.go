package model

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	DefaultRegistrationIPAutoBanThreshold     = 5
	DefaultRegistrationIPAutoBanWindowHours   = 24
	DefaultRegistrationIPAutoBanDurationHours = 24
	RegistrationProtectionEnabled             = 1
	RegistrationProtectionDisabled            = 0
)

type RegistrationProtectionSetting struct {
	Id            int   `json:"id"`
	Enabled       int   `json:"enabled"`
	Threshold     int   `json:"threshold"`
	WindowHours   int   `json:"window_hours"`
	DurationHours int   `json:"duration_hours"`
	UpdatedAt     int64 `json:"updated_at" gorm:"bigint"`
}

func GetRegistrationProtectionSetting() (*RegistrationProtectionSetting, error) {
	var setting RegistrationProtectionSetting
	err := DB.First(&setting, "id = ?", 1).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		setting = RegistrationProtectionSetting{
			Id:            1,
			Enabled:       RegistrationProtectionEnabled,
			Threshold:     DefaultRegistrationIPAutoBanThreshold,
			WindowHours:   DefaultRegistrationIPAutoBanWindowHours,
			DurationHours: DefaultRegistrationIPAutoBanDurationHours,
		}
		if err := DB.Create(&setting).Error; err != nil {
			return nil, err
		}
		return &setting, nil
	}
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

func UpdateRegistrationProtectionSetting(setting *RegistrationProtectionSetting) error {
	if setting == nil {
		return errors.New("registration protection setting is required")
	}
	if setting.Enabled != RegistrationProtectionEnabled && setting.Enabled != RegistrationProtectionDisabled {
		return errors.New("registration protection enabled value is invalid")
	}
	if setting.Threshold < 1 || setting.Threshold > 10000 {
		return fmt.Errorf("registration threshold must be between 1 and 10000")
	}
	if setting.WindowHours < 1 || setting.WindowHours > 8760 {
		return fmt.Errorf("registration window must be between 1 and 8760 hours")
	}
	if setting.DurationHours < 0 || setting.DurationHours > 8760 {
		return fmt.Errorf("registration ban duration must be between 0 and 8760 hours")
	}
	setting.Id = 1
	setting.UpdatedAt = common.GetTimestamp()
	return DB.Save(setting).Error
}
