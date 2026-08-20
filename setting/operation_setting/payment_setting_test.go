package operation_setting

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidatePaymentReturnOrigins(t *testing.T) {
	tests := []struct {
		name    string
		value   string
		wantErr bool
	}{
		{
			name:  "accepts multiple exact HTTPS origins",
			value: `["https://ai.pkcfcf.cn","https://cybertruckai.top"]`,
		},
		{
			name:  "accepts empty list for legacy fallback",
			value: `[]`,
		},
		{
			name:    "rejects origin with path",
			value:   `["https://ai.pkcfcf.cn/wallet"]`,
			wantErr: true,
		},
		{
			name:    "rejects wildcard origin",
			value:   `["https://*.pkcfcf.cn"]`,
			wantErr: true,
		},
		{
			name:    "rejects non-HTTP scheme",
			value:   `["javascript:alert(1)"]`,
			wantErr: true,
		},
		{
			name:    "rejects null",
			value:   `null`,
			wantErr: true,
		},
		{
			name:    "rejects non-array JSON",
			value:   `"https://ai.pkcfcf.cn"`,
			wantErr: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := ValidatePaymentReturnOrigins(test.value)
			if test.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}
