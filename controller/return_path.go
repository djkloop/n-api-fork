package controller

import (
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func paymentReturnPath(c *gin.Context, suffix string) string {
	return service.PaymentReturnURLForRequest(c.Request, suffix)
}
