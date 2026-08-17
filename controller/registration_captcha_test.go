package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetRegistrationCaptchaReturnsImage(t *testing.T) {
	gin.SetMode(gin.TestMode)
	originalEnabled := common.RegistrationCaptchaEnabled
	common.RegistrationCaptchaEnabled = true
	t.Cleanup(func() {
		common.RegistrationCaptchaEnabled = originalEnabled
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/captcha", nil)

	GetRegistrationCaptcha(ctx)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"success":true`)
	assert.Contains(t, recorder.Body.String(), "data:image/png;base64,")
}

func TestRegisterRejectsMissingCaptchaBeforeDatabaseAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	originalRegisterEnabled := common.RegisterEnabled
	originalPasswordRegisterEnabled := common.PasswordRegisterEnabled
	originalCaptchaEnabled := common.RegistrationCaptchaEnabled
	common.RegisterEnabled = true
	common.PasswordRegisterEnabled = true
	common.RegistrationCaptchaEnabled = true
	t.Cleanup(func() {
		common.RegisterEnabled = originalRegisterEnabled
		common.PasswordRegisterEnabled = originalPasswordRegisterEnabled
		common.RegistrationCaptchaEnabled = originalCaptchaEnabled
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/user/register",
		strings.NewReader(`{"username":"captcha-test","password":"password123"}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	require.NotPanics(t, func() {
		Register(ctx)
	})
	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"success":false`)
}
