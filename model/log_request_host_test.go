package model

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeRequestHost(t *testing.T) {
	tests := []struct {
		name string
		host string
		want string
	}{
		{name: "domain with port", host: "AI.PKCFCF.CN:443", want: "ai.pkcfcf.cn"},
		{name: "domain with trailing dot", host: "CyberTruckAI.Top.", want: "cybertruckai.top"},
		{name: "ipv6 with port", host: "[2001:db8::1]:8443", want: "2001:db8::1"},
		{name: "empty", host: "  ", want: ""},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			assert.Equal(t, test.want, normalizeRequestHost(test.host))
		})
	}
}

func TestAppendRequestHostAdminInfoPreservesExistingFields(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "https://example.test/v1/chat/completions", nil)
	c.Request.Host = "AI.PKCFCF.CN:443"
	other := map[string]interface{}{
		"admin_info": map[string]interface{}{
			"use_channel": []int{3, 5},
		},
	}

	result := appendRequestHostAdminInfo(c, other)
	adminInfo, ok := result["admin_info"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, "ai.pkcfcf.cn", adminInfo["request_host"])
	assert.Equal(t, []int{3, 5}, adminInfo["use_channel"])
}
