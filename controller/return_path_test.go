package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestPaymentReturnPathUsesDefaultDashboardRoutes(t *testing.T) {
	previousAddress := system_setting.ServerAddress
	previousOrigins := operation_setting.GetPaymentSetting().ReturnOrigins
	system_setting.ServerAddress = "https://dashboard.example.com/"
	operation_setting.GetPaymentSetting().ReturnOrigins = nil
	t.Cleanup(func() {
		system_setting.ServerAddress = previousAddress
		operation_setting.GetPaymentSetting().ReturnOrigins = previousOrigins
	})

	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest(http.MethodPost, "http://internal/api/user/pay", nil)

	assert.Equal(
		t,
		"https://dashboard.example.com/wallet?pay=success",
		paymentReturnPath(context, "/wallet?pay=success"),
	)
	assert.Equal(
		t,
		"https://dashboard.example.com/usage-logs",
		paymentReturnPath(context, "/usage-logs"),
	)
}
