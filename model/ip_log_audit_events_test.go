package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListIPLogAuditEventsIncludesRequestHost(t *testing.T) {
	const ip = "192.0.2.201"
	require.NoError(t, LOG_DB.Where("ip = ?", ip).Delete(&Log{}).Error)
	t.Cleanup(func() {
		_ = LOG_DB.Where("ip = ?", ip).Delete(&Log{}).Error
	})

	require.NoError(t, LOG_DB.Create(&Log{
		UserId:    17,
		Username:  "domain-audit-user",
		CreatedAt: common.GetTimestamp(),
		Type:      LogTypeConsume,
		ModelName: "gpt-domain-audit",
		Ip:        ip,
		RequestId: "domain-audit-request",
		Other: common.MapToJsonStr(map[string]interface{}{
			"admin_info": map[string]interface{}{
				"request_host": "ai.pkcfcf.cn",
			},
		}),
	}).Error)

	events, total, err := ListIPLogAuditEvents(ip, 0, 10)
	require.NoError(t, err)
	require.EqualValues(t, 1, total)
	require.Len(t, events, 1)
	assert.Equal(t, "ai.pkcfcf.cn", events[0].RequestHost)
}
