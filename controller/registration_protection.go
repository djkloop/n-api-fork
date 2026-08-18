package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func GetRegistrationProtectionSetting(c *gin.Context) {
	setting, err := model.GetRegistrationProtectionSetting()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, setting)
}

func UpdateRegistrationProtectionSetting(c *gin.Context) {
	var setting model.RegistrationProtectionSetting
	if err := common.DecodeJson(c.Request.Body, &setting); err != nil {
		common.ApiErrorMsg(c, "invalid registration protection parameters")
		return
	}
	if err := model.UpdateRegistrationProtectionSetting(&setting); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	model.RecordOperationAuditLog(c.GetInt("id"), "Updated registration IP protection settings", c.ClientIP(), "registration_protection.update", map[string]interface{}{
		"enabled": setting.Enabled, "threshold": setting.Threshold, "subnet_threshold": setting.SubnetThreshold,
		"asn_threshold": setting.ASNThreshold, "blocked_asns": setting.BlockedASNs,
		"window_hours": setting.WindowHours, "duration_hours": setting.DurationHours,
	}, nil, nil)
	common.ApiSuccess(c, setting)
}
