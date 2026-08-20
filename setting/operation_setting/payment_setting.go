package operation_setting

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
)

type PaymentSetting struct {
	AmountOptions  []int           `json:"amount_options"`
	AmountDiscount map[int]float64 `json:"amount_discount"` // 充值金额对应的折扣，例如 100 元 0.9 表示 100 元充值享受 9 折优惠
	ReturnOrigins  []string        `json:"return_origins"`

	ComplianceConfirmed    bool   `json:"compliance_confirmed"`
	ComplianceTermsVersion string `json:"compliance_terms_version"`
	ComplianceConfirmedAt  int64  `json:"compliance_confirmed_at"`
	ComplianceConfirmedBy  int    `json:"compliance_confirmed_by"`
	ComplianceConfirmedIP  string `json:"compliance_confirmed_ip"`
}

const CurrentComplianceTermsVersion = "v1"

// 默认配置
var paymentSetting = PaymentSetting{
	AmountOptions:  []int{10, 20, 50, 100, 200, 500},
	AmountDiscount: map[int]float64{},
	ReturnOrigins:  []string{},
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("payment_setting", &paymentSetting)
}

func GetPaymentSetting() *PaymentSetting {
	return &paymentSetting
}

func ValidatePaymentReturnOrigins(value string) error {
	var origins []string
	if err := common.UnmarshalJsonStr(value, &origins); err != nil {
		return fmt.Errorf("支付返回来源必须是 JSON 字符串数组: %w", err)
	}
	if origins == nil {
		return fmt.Errorf("支付返回来源必须是 JSON 字符串数组")
	}
	for _, origin := range origins {
		if strings.TrimSpace(origin) == "" {
			return fmt.Errorf("支付返回来源不能为空")
		}
		if _, err := common.NormalizeOrigin(origin); err != nil {
			return fmt.Errorf("无效的支付返回来源 %q: %w", origin, err)
		}
	}
	return nil
}

func IsPaymentComplianceConfirmed() bool {
	return paymentSetting.ComplianceConfirmed &&
		paymentSetting.ComplianceTermsVersion == CurrentComplianceTermsVersion
}
