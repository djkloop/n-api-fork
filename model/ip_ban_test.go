package model

import (
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func resetIPBanTables(t *testing.T) {
	t.Helper()
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&RegistrationIPEvent{}).Error)
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&RegistrationGuardLock{}).Error)
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&IPBan{}).Error)
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&RegistrationProtectionSetting{}).Error)
}

func TestIPBanLifecycleHonorsExpiryAndRelease(t *testing.T) {
	resetIPBanTables(t)

	ban, err := UpsertIPBan("192.0.2.10", "abuse", IPBanSourceManual, common.GetTimestamp()+60, false)
	require.NoError(t, err)

	blocked, err := IsIPBanned("192.0.2.10")
	require.NoError(t, err)
	assert.True(t, blocked)

	require.NoError(t, ReleaseIPBan(ban.Id, 7))
	blocked, err = IsIPBanned("192.0.2.10")
	require.NoError(t, err)
	assert.False(t, blocked)

	_, err = UpsertIPBan("192.0.2.11", "expired", IPBanSourceManual, time.Now().Add(-time.Minute).Unix(), false)
	require.NoError(t, err)
	blocked, err = IsIPBanned("192.0.2.11")
	require.NoError(t, err)
	assert.False(t, blocked)
}

func TestRegistrationIPThresholdCreatesAutomaticBan(t *testing.T) {
	resetIPBanTables(t)
	setting, err := GetRegistrationProtectionSetting()
	require.NoError(t, err)
	setting.Enabled = RegistrationProtectionEnabled
	setting.Threshold = 2
	setting.SubnetThreshold = 0
	setting.ASNThreshold = 0
	setting.WindowHours = 24
	setting.DurationHours = 12
	require.NoError(t, UpdateRegistrationProtectionSetting(setting))

	triggered, err := RecordRegistrationIP("2001:db8::1", 101)
	require.NoError(t, err)
	assert.False(t, triggered)

	triggered, err = RecordRegistrationIP("2001:0db8:0:0:0:0:0:1", 102)
	require.NoError(t, err)
	assert.True(t, triggered)

	blocked, err := IsIPBanned("2001:db8::1")
	require.NoError(t, err)
	assert.True(t, blocked)

	bans, total, err := ListIPBans(0, 10, "2001:db8::1")
	require.NoError(t, err)
	require.EqualValues(t, 1, total)
	require.Len(t, bans, 1)
	assert.Equal(t, IPBanSourceAuto, bans[0].Source)
	assert.Equal(t, "active", bans[0].DisplayStatus)
}

func TestCreateRegisteredUserEnforcesSubnetThresholdAcrossRotatingIPs(t *testing.T) {
	resetIPBanTables(t)
	DB.Unscoped().Where("username LIKE ?", "subnet-guard-%").Delete(&User{})

	setting, err := GetRegistrationProtectionSetting()
	require.NoError(t, err)
	setting.Enabled = RegistrationProtectionEnabled
	setting.Threshold = 100
	setting.SubnetThreshold = 2
	setting.ASNThreshold = 0
	setting.BlockedASNs = ""
	setting.WindowHours = 24
	setting.DurationHours = 12
	require.NoError(t, UpdateRegistrationProtectionSetting(setting))

	for index, ip := range []string{"198.51.100.10", "198.51.100.20"} {
		username := fmt.Sprintf("subnet-guard-%d", index)
		err := CreateRegisteredUser(ip, "password", func(tx *gorm.DB) (int, error) {
			user := User{Username: username, Password: "password123", Role: common.RoleCommonUser}
			if err := user.InsertWithTx(tx, 0); err != nil {
				return 0, err
			}
			return user.Id, nil
		})
		require.NoError(t, err)
	}

	err = CreateRegisteredUser("198.51.100.30", "password", func(tx *gorm.DB) (int, error) {
		user := User{Username: "subnet-guard-blocked", Password: "password123", Role: common.RoleCommonUser}
		if err := user.InsertWithTx(tx, 0); err != nil {
			return 0, err
		}
		return user.Id, nil
	})
	require.ErrorIs(t, err, ErrRegistrationBlocked)

	var events int64
	require.NoError(t, DB.Model(&RegistrationIPEvent{}).Where("network = ?", "198.51.100.0/24").Count(&events).Error)
	assert.EqualValues(t, 2, events)
	var blockedUsers int64
	require.NoError(t, DB.Unscoped().Model(&User{}).Where("username = ?", "subnet-guard-blocked").Count(&blockedUsers).Error)
	assert.Zero(t, blockedUsers)
}

func TestCreateRegisteredUserSerializesConcurrentRotatingIPs(t *testing.T) {
	resetIPBanTables(t)
	DB.Unscoped().Where("username LIKE ?", "concurrent-subnet-%").Delete(&User{})

	setting, err := GetRegistrationProtectionSetting()
	require.NoError(t, err)
	setting.Enabled = RegistrationProtectionEnabled
	setting.Threshold = 100
	setting.SubnetThreshold = 1
	setting.ASNThreshold = 0
	setting.BlockedASNs = ""
	setting.WindowHours = 24
	require.NoError(t, UpdateRegistrationProtectionSetting(setting))

	start := make(chan struct{})
	results := make(chan error, 2)
	var waitGroup sync.WaitGroup
	for index, ip := range []string{"203.0.113.10", "203.0.113.20"} {
		waitGroup.Add(1)
		go func(index int, ip string) {
			defer waitGroup.Done()
			<-start
			results <- CreateRegisteredUser(ip, "password", func(tx *gorm.DB) (int, error) {
				user := User{Username: fmt.Sprintf("concurrent-subnet-%d", index), Password: "password123", Role: common.RoleCommonUser}
				if err := user.InsertWithTx(tx, 0); err != nil {
					return 0, err
				}
				return user.Id, nil
			})
		}(index, ip)
	}
	close(start)
	waitGroup.Wait()
	close(results)

	successes := 0
	blocked := 0
	for result := range results {
		switch {
		case result == nil:
			successes++
		case errors.Is(result, ErrRegistrationBlocked):
			blocked++
		default:
			require.NoError(t, result)
		}
	}
	assert.Equal(t, 1, successes)
	assert.Equal(t, 1, blocked)
}

func TestBlockedASNConfigurationNormalizesAndMatches(t *testing.T) {
	normalized, err := normalizeBlockedASNs("AS26548, 200373;AS26548")
	require.NoError(t, err)
	assert.Equal(t, "26548,200373", normalized)
	assert.True(t, registrationASNBlocked(normalized, 200373))
	assert.False(t, registrationASNBlocked(normalized, 4134))

	_, err = normalizeBlockedASNs("AS-not-a-number")
	require.Error(t, err)
}

func TestRegistrationIdentityUsesStableNetworkPrefixes(t *testing.T) {
	_, ipv4Network, _, err := registrationIdentity("::ffff:192.0.2.25")
	require.NoError(t, err)
	assert.Equal(t, "192.0.2.0/24", ipv4Network)

	_, ipv6Network, _, err := registrationIdentity("2001:db8:abcd:1234::1")
	require.NoError(t, err)
	assert.Equal(t, "2001:db8:abcd::/48", ipv6Network)
}
