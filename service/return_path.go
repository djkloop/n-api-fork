package service

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

func PaymentReturnURL(suffix string) string {
	return buildPaymentReturnURL(system_setting.ServerAddress, suffix)
}

func PaymentReturnURLForRequest(request *http.Request, suffix string) string {
	return buildPaymentReturnURL(paymentReturnOrigin(request), suffix)
}

func paymentReturnOrigin(request *http.Request) string {
	allowedOrigins := operation_setting.GetPaymentSetting().ReturnOrigins
	if request == nil || len(allowedOrigins) == 0 {
		return system_setting.ServerAddress
	}

	normalizedAllowed := make([]string, 0, len(allowedOrigins))
	for _, rawOrigin := range allowedOrigins {
		normalized, err := common.NormalizeOrigin(rawOrigin)
		if err == nil {
			normalizedAllowed = append(normalizedAllowed, normalized)
		}
	}

	requestOrigins := []string{request.Header.Get("Origin")}
	if referer, err := url.Parse(request.Referer()); err == nil && referer.Scheme != "" && referer.Host != "" {
		requestOrigins = append(requestOrigins, referer.Scheme+"://"+referer.Host)
	}
	for _, requestOrigin := range requestOrigins {
		normalized, err := common.NormalizeOrigin(requestOrigin)
		if err != nil {
			continue
		}
		for _, allowedOrigin := range normalizedAllowed {
			if normalized == allowedOrigin {
				return allowedOrigin
			}
		}
	}

	requestHost := strings.TrimSpace(request.Host)
	for _, allowedOrigin := range normalizedAllowed {
		parsed, err := url.Parse(allowedOrigin)
		if err != nil {
			continue
		}
		requestOrigin, err := common.NormalizeOrigin(parsed.Scheme + "://" + requestHost)
		if err == nil && requestOrigin == allowedOrigin {
			return allowedOrigin
		}
	}
	return system_setting.ServerAddress
}

func buildPaymentReturnURL(origin string, suffix string) string {
	base := strings.TrimRight(origin, "/")
	return base + suffix
}
