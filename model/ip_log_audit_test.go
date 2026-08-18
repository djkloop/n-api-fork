package model

import (
	"context"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestScanIPLogAuditsAggregatesAndResumesFromCursor(t *testing.T) {
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&IPLogAudit{}).Error)
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&IPLogAuditCursor{}).Error)
	require.NoError(t, LOG_DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&Log{}).Error)

	now := common.GetTimestamp() - 30
	require.NoError(t, LOG_DB.Create(&Log{
		UserId: 7, Username: "audit-user", CreatedAt: now, Type: LogTypeConsume,
		ModelName: "gpt-audit", TokenName: "token-audit", Quota: 120,
		PromptTokens: 20, CompletionTokens: 30, Ip: "2001:0db8:0:0:0:0:0:1", RequestId: "audit-1",
	}).Error)
	require.NoError(t, LOG_DB.Create(&Log{
		UserId: 7, Username: "audit-user", CreatedAt: now + 1, Type: LogTypeError,
		ModelName: "gpt-audit", Quota: 0, Ip: "2001:db8::1", RequestId: "audit-2",
	}).Error)

	result, err := ScanIPLogAudits(context.Background())
	require.NoError(t, err)
	assert.EqualValues(t, 2, result.LogsScanned)

	var audit IPLogAudit
	require.NoError(t, DB.Where("ip = ?", "2001:db8::1").First(&audit).Error)
	assert.EqualValues(t, 2, audit.LogCount)
	assert.EqualValues(t, 2, audit.RequestCount)
	assert.EqualValues(t, 1, audit.ConsumeCount)
	assert.EqualValues(t, 1, audit.ErrorCount)
	assert.EqualValues(t, 120, audit.Quota)
	assert.EqualValues(t, 20, audit.PromptTokens)
	assert.EqualValues(t, 30, audit.CompletionTokens)
	assert.Equal(t, "audit-user", audit.LastUsername)
	assert.Equal(t, "gpt-audit", audit.LastModelName)
	assert.Equal(t, 6, audit.IPVersion)
	assert.False(t, audit.IsPrivate)

	_, err = ScanIPLogAudits(context.Background())
	require.NoError(t, err)
	var unchanged IPLogAudit
	require.NoError(t, DB.Where("ip = ?", "2001:db8::1").First(&unchanged).Error)
	assert.EqualValues(t, 2, unchanged.LogCount)

	require.NoError(t, LOG_DB.Create(&Log{
		UserId: 8, Username: "second-user", CreatedAt: now + 3, Type: LogTypeConsume,
		ModelName: "gpt-next", Quota: 50, Ip: "2001:db8::1", RequestId: "audit-3",
	}).Error)
	_, err = ScanIPLogAudits(context.Background())
	require.NoError(t, err)
	require.NoError(t, DB.Where("ip = ?", "2001:db8::1").First(&audit).Error)
	assert.EqualValues(t, 3, audit.LogCount)
	assert.EqualValues(t, 2, audit.ConsumeCount)
	assert.EqualValues(t, 170, audit.Quota)
	assert.Equal(t, "second-user", audit.LastUsername)
	assert.Equal(t, "gpt-next", audit.LastModelName)
}

func TestListIPLogAuditsMarksActiveBans(t *testing.T) {
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&IPLogAudit{}).Error)
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&IPBan{}).Error)
	require.NoError(t, DB.Create(&IPLogAudit{IP: "192.0.2.44", FirstSeenAt: time.Now().Unix(), LastSeenAt: time.Now().Unix(), RequestCount: 4}).Error)
	_, err := UpsertIPBan("192.0.2.44", "audit", IPBanSourceManual, 0, false)
	require.NoError(t, err)

	items, total, err := ListIPLogAudits(0, 10, "192.0.2.44", "calls")
	require.NoError(t, err)
	require.EqualValues(t, 1, total)
	require.Len(t, items, 1)
	assert.True(t, items[0].Banned)
}
