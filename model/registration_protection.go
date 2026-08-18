package model

import (
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	DefaultRegistrationIPAutoBanThreshold     = 5
	DefaultRegistrationSubnetThreshold        = 20
	DefaultRegistrationIPAutoBanWindowHours   = 24
	DefaultRegistrationIPAutoBanDurationHours = 24
	RegistrationProtectionEnabled             = 1
	RegistrationProtectionDisabled            = 0
)

type RegistrationProtectionSetting struct {
	Id                   int    `json:"id"`
	Enabled              int    `json:"enabled"`
	Threshold            int    `json:"threshold"`
	SubnetThreshold      int    `json:"subnet_threshold"`
	ASNThreshold         int    `json:"asn_threshold"`
	BlockedASNs          string `json:"blocked_asns" gorm:"type:text"`
	WindowHours          int    `json:"window_hours"`
	DurationHours        int    `json:"duration_hours"`
	UpdatedAt            int64  `json:"updated_at" gorm:"bigint"`
	ASNDatabaseAvailable bool   `json:"asn_database_available" gorm:"-"`
	ASNDatabaseError     string `json:"asn_database_error,omitempty" gorm:"-"`
}

func GetRegistrationProtectionSetting() (*RegistrationProtectionSetting, error) {
	var setting RegistrationProtectionSetting
	err := DB.First(&setting, "id = ?", 1).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		setting = RegistrationProtectionSetting{
			Id:              1,
			Enabled:         RegistrationProtectionEnabled,
			Threshold:       DefaultRegistrationIPAutoBanThreshold,
			SubnetThreshold: DefaultRegistrationSubnetThreshold,
			WindowHours:     DefaultRegistrationIPAutoBanWindowHours,
			DurationHours:   DefaultRegistrationIPAutoBanDurationHours,
		}
		if err := DB.Create(&setting).Error; err != nil {
			return nil, err
		}
		setting.ASNDatabaseAvailable = common.ASNDatabaseAvailable()
		setting.ASNDatabaseError = common.ASNDatabaseError()
		return &setting, nil
	}
	if err != nil {
		return nil, err
	}
	setting.ASNDatabaseAvailable = common.ASNDatabaseAvailable()
	setting.ASNDatabaseError = common.ASNDatabaseError()
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
	if setting.SubnetThreshold < 0 || setting.SubnetThreshold > 1000000 {
		return fmt.Errorf("registration subnet threshold must be between 0 and 1000000")
	}
	if setting.ASNThreshold < 0 || setting.ASNThreshold > 1000000 {
		return fmt.Errorf("registration ASN threshold must be between 0 and 1000000")
	}
	if setting.WindowHours < 1 || setting.WindowHours > 8760 {
		return fmt.Errorf("registration window must be between 1 and 8760 hours")
	}
	if setting.DurationHours < 0 || setting.DurationHours > 8760 {
		return fmt.Errorf("registration ban duration must be between 0 and 8760 hours")
	}
	blockedASNs, err := normalizeBlockedASNs(setting.BlockedASNs)
	if err != nil {
		return err
	}
	setting.Id = 1
	setting.BlockedASNs = blockedASNs
	setting.UpdatedAt = common.GetTimestamp()
	return DB.Save(setting).Error
}

func normalizeBlockedASNs(value string) (string, error) {
	if len(value) > 4096 {
		return "", errors.New("blocked ASN list is too long")
	}
	parts := strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == ';' || r == '\n' || r == '\r' || r == '\t' || r == ' '
	})
	unique := make(map[uint32]struct{}, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(strings.TrimPrefix(strings.ToUpper(part), "AS"))
		asn, err := strconv.ParseUint(part, 10, 32)
		if err != nil || asn == 0 {
			return "", fmt.Errorf("invalid blocked ASN %q", part)
		}
		unique[uint32(asn)] = struct{}{}
	}
	if len(unique) > 256 {
		return "", errors.New("blocked ASN list cannot contain more than 256 entries")
	}
	asns := make([]uint32, 0, len(unique))
	for asn := range unique {
		asns = append(asns, asn)
	}
	sort.Slice(asns, func(i, j int) bool { return asns[i] < asns[j] })
	normalized := make([]string, 0, len(asns))
	for _, asn := range asns {
		normalized = append(normalized, strconv.FormatUint(uint64(asn), 10))
	}
	return strings.Join(normalized, ","), nil
}

func registrationASNBlocked(blockedASNs string, asn uint32) bool {
	if asn == 0 || blockedASNs == "" {
		return false
	}
	needle := strconv.FormatUint(uint64(asn), 10)
	for _, blocked := range strings.Split(blockedASNs, ",") {
		if strings.TrimSpace(blocked) == needle {
			return true
		}
	}
	return false
}
