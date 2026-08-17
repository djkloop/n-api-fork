package model

import (
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
