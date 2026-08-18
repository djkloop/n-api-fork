package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type ipLogAuditPage struct {
	Page     int                     `json:"page"`
	PageSize int                     `json:"page_size"`
	Total    int64                   `json:"total"`
	Items    []*model.IPLogAudit     `json:"items"`
	Summary  model.IPLogAuditSummary `json:"summary"`
}

type ipLogAuditEventsPage struct {
	Page     int                     `json:"page"`
	PageSize int                     `json:"page_size"`
	Total    int64                   `json:"total"`
	Items    []model.IPLogAuditEvent `json:"items"`
}

func GetIPLogAuditEvents(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	events, total, err := model.ListIPLogAuditEvents(c.Param("ip"), pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, ipLogAuditEventsPage{
		Page: pageInfo.GetPage(), PageSize: pageInfo.GetPageSize(), Total: total, Items: events,
	})
}

func GetIPLogAudits(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	audits, total, err := model.ListIPLogAudits(
		pageInfo.GetStartIdx(),
		pageInfo.GetPageSize(),
		c.Query("keyword"),
		c.Query("sort"),
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	summary, err := model.GetIPLogAuditSummary()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, ipLogAuditPage{
		Page: pageInfo.GetPage(), PageSize: pageInfo.GetPageSize(), Total: total,
		Items: audits, Summary: summary,
	})
}
