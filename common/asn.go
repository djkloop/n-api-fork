package common

import (
	"net/netip"
	"os"
	"strings"
	"sync"

	"github.com/oschwald/maxminddb-golang/v2"
)

type asnRecord struct {
	AutonomousSystemNumber uint32 `maxminddb:"autonomous_system_number"`
}

var (
	asnDatabaseOnce   sync.Once
	asnDatabaseReader *maxminddb.Reader
	asnDatabaseError  string
)

func loadASNDatabase() {
	path := strings.TrimSpace(os.Getenv("ASN_DB_PATH"))
	if path == "" {
		return
	}
	reader, err := maxminddb.Open(path)
	if err != nil {
		asnDatabaseError = err.Error()
		SysError("failed to load ASN database: " + err.Error())
		return
	}
	if !strings.Contains(strings.ToLower(reader.Metadata.DatabaseType), "asn") {
		asnDatabaseError = "configured MMDB is not an ASN database"
		_ = reader.Close()
		SysError("failed to load ASN database: " + asnDatabaseError)
		return
	}
	asnDatabaseReader = reader
}

// ASNDatabaseAvailable reports whether ASN_DB_PATH points to a readable MMDB
// database. The database is opened once and reused for concurrent lookups.
func ASNDatabaseAvailable() bool {
	asnDatabaseOnce.Do(loadASNDatabase)
	return asnDatabaseReader != nil
}

func ASNDatabaseError() string {
	asnDatabaseOnce.Do(loadASNDatabase)
	return asnDatabaseError
}

// LookupASN resolves an IP through the optional local MMDB database configured
// by ASN_DB_PATH. It never performs a network request.
func LookupASN(ip string) (uint32, bool) {
	if !ASNDatabaseAvailable() {
		return 0, false
	}
	address, err := netip.ParseAddr(strings.TrimSpace(ip))
	if err != nil {
		return 0, false
	}
	var record asnRecord
	if err := asnDatabaseReader.Lookup(address.Unmap()).Decode(&record); err != nil || record.AutonomousSystemNumber == 0 {
		return 0, false
	}
	return record.AutonomousSystemNumber, true
}
