package model

import (
	"errors"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

var ErrInvalidEmailIdentity = errors.New("email identity is invalid")

var plusAliasEmailDomains = map[string]bool{
	"gmail.com":      true,
	"googlemail.com": true,
	"hotmail.com":    true,
	"live.com":       true,
	"msn.com":        true,
	"outlook.cn":     true,
	"outlook.com":    true,
}

// CanonicalizeEmail returns the stable mailbox identity used to prevent one
// provider mailbox from registering repeatedly through aliases. The original
// normalized address remains stored for delivery, sign-in, and password reset.
func CanonicalizeEmail(email string) (string, error) {
	email = NormalizeEmail(email)
	if email == "" {
		return "", nil
	}
	if strings.Count(email, "@") != 1 || strings.ContainsAny(email, " \t\r\n") {
		return "", ErrInvalidEmailIdentity
	}
	if err := common.Validate.Var(email, "required,email"); err != nil {
		return "", ErrInvalidEmailIdentity
	}
	local, domain, _ := strings.Cut(email, "@")
	if local == "" || domain == "" {
		return "", ErrInvalidEmailIdentity
	}
	if plusAliasEmailDomains[domain] {
		local, _, _ = strings.Cut(local, "+")
	}
	if domain == "gmail.com" || domain == "googlemail.com" {
		local = strings.ReplaceAll(local, ".", "")
		domain = "gmail.com"
	}
	if local == "" {
		return "", ErrInvalidEmailIdentity
	}
	return local + "@" + domain, nil
}

func claimCanonicalEmailWithTx(tx *gorm.DB, userID int, email string) error {
	canonical, err := CanonicalizeEmail(email)
	if err != nil {
		return err
	}
	if canonical == "" {
		return nil
	}
	if err := ClaimExternalIdentityWithTx(tx, ExternalIdentityProviderEmailCanonical, canonical, userID); err != nil {
		if errors.Is(err, ErrExternalIdentityAlreadyClaimed) {
			return ErrEmailAlreadyTaken
		}
		return err
	}
	return nil
}

func replaceCanonicalEmailClaimWithTx(tx *gorm.DB, userID int, email string) error {
	if err := ReleaseExternalIdentityWithTx(tx, ExternalIdentityProviderEmailCanonical, userID); err != nil {
		return err
	}
	return claimCanonicalEmailWithTx(tx, userID, email)
}

// InitializeUserEmailCanonicals backfills the derived identity after the User
// migration adds the column. Historical collisions are retained so upgrades
// never delete or rewrite accounts; they still prevent further alias signups.
func InitializeUserEmailCanonicals() error {
	const batchSize = 500
	lastID := 0
	invalidEmails := 0
	for {
		var users []User
		if err := DB.Unscoped().
			Select("id", "email", "email_canonical").
			Where("id > ?", lastID).
			Order("id ASC").
			Limit(batchSize).
			Find(&users).Error; err != nil {
			return err
		}
		if len(users) == 0 {
			if invalidEmails > 0 {
				common.SysError("skipped invalid historical email identities during canonical backfill")
			}
			return nil
		}
		if err := DB.Transaction(func(tx *gorm.DB) error {
			for _, user := range users {
				canonical, err := CanonicalizeEmail(user.Email)
				if err != nil {
					invalidEmails++
					canonical = ""
				}
				if canonical == user.EmailCanonical {
					continue
				}
				if err := tx.Unscoped().Model(&User{}).
					Where("id = ?", user.Id).
					UpdateColumn("email_canonical", canonical).Error; err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			return err
		}
		lastID = users[len(users)-1].Id
	}
}
