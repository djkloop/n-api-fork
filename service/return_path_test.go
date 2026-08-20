package service

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/assert"
)

func TestPaymentReturnURLUsesSuppliedDefaultDashboardPath(t *testing.T) {
	previousAddress := system_setting.ServerAddress
	system_setting.ServerAddress = "https://dashboard.example.com/"
	t.Cleanup(func() { system_setting.ServerAddress = previousAddress })

	assert.Equal(t, "https://dashboard.example.com/wallet", PaymentReturnURL("/wallet"))
}

func TestPaymentReturnURLForRequestUsesAllowedRequestOrigin(t *testing.T) {
	paymentSetting := operation_setting.GetPaymentSetting()
	previousOrigins := paymentSetting.ReturnOrigins
	previousAddress := system_setting.ServerAddress
	paymentSetting.ReturnOrigins = []string{
		"https://ai.pkcfcf.cn",
		"https://cybertruckai.top",
	}
	system_setting.ServerAddress = "https://fallback.example.com"
	t.Cleanup(func() {
		paymentSetting.ReturnOrigins = previousOrigins
		system_setting.ServerAddress = previousAddress
	})

	tests := []struct {
		name     string
		host     string
		origin   string
		referer  string
		expected string
	}{
		{
			name:     "domestic browser origin",
			host:     "ai.pkcfcf.cn",
			origin:   "https://ai.pkcfcf.cn",
			expected: "https://ai.pkcfcf.cn/usage-logs",
		},
		{
			name:     "overseas browser origin",
			host:     "cybertruckai.top",
			origin:   "https://cybertruckai.top",
			expected: "https://cybertruckai.top/usage-logs",
		},
		{
			name:     "referer fallback",
			host:     "internal:3000",
			referer:  "https://cybertruckai.top/wallet",
			expected: "https://cybertruckai.top/usage-logs",
		},
		{
			name:     "host fallback normalizes default port",
			host:     "ai.pkcfcf.cn:443",
			expected: "https://ai.pkcfcf.cn/usage-logs",
		},
		{
			name:     "untrusted request falls back to server address",
			host:     "evil.example.com",
			origin:   "https://evil.example.com",
			expected: "https://fallback.example.com/usage-logs",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "http://internal/api/user/pay", nil)
			request.Host = test.host
			if test.origin != "" {
				request.Header.Set("Origin", test.origin)
			}
			if test.referer != "" {
				request.Header.Set("Referer", test.referer)
			}

			assert.Equal(t, test.expected, PaymentReturnURLForRequest(request, "/usage-logs"))
		})
	}
}

func TestPaymentReturnURLForRequestPreservesLegacyFallbackWithoutOrigins(t *testing.T) {
	paymentSetting := operation_setting.GetPaymentSetting()
	previousOrigins := paymentSetting.ReturnOrigins
	previousAddress := system_setting.ServerAddress
	paymentSetting.ReturnOrigins = nil
	system_setting.ServerAddress = "https://dashboard.example.com"
	t.Cleanup(func() {
		paymentSetting.ReturnOrigins = previousOrigins
		system_setting.ServerAddress = previousAddress
	})

	request := httptest.NewRequest(http.MethodPost, "https://ai.pkcfcf.cn/api/user/pay", nil)
	assert.Equal(
		t,
		"https://dashboard.example.com/usage-logs",
		PaymentReturnURLForRequest(request, "/usage-logs"),
	)
}
