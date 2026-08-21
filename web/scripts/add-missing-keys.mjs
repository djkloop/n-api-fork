import fs from 'node:fs/promises'
import path from 'node:path'

const dir = path.resolve('src/i18n/locales')
const values = {
  en: {
    Automatic: 'Automatic',
    'Request Domain': 'Request Domain',
    'Security auditing tools restricted to super administrators.':
      'Security auditing tools restricted to super administrators.',
    'Block IP': 'Block IP',
    'Block IP {{ip}}': 'Block IP {{ip}}',
    'Block registration from {{ip}} for 24 hours? You can unblock it later from IP Blackroom.':
      'Block registration from {{ip}} for 24 hours? You can unblock it later from IP Blackroom.',
    'Enter a valid IP and duration': 'Enter a valid IP and duration',
    'Failed to block IP': 'Failed to block IP',
    'Failed to unblock IP': 'Failed to unblock IP',
    'IP address': 'IP address',
    'IP Blackroom': 'IP Blackroom',
    'IP blocked successfully': 'IP blocked successfully',
    'IP unblocked successfully': 'IP unblocked successfully',
    Manual: 'Manual',
    'Manual block': 'Manual block',
    'Manage manual and automatic registration IP blocks.':
      'Manage manual and automatic registration IP blocks.',
    'No IP bans found': 'No IP bans found',
    Permanent: 'Permanent',
    'Search IP bans': 'Search IP bans',
    Unblock: 'Unblock',
  },
  zh: {
    Automatic: '自动',
    'Request Domain': '请求域名',
    'Security auditing tools restricted to super administrators.':
      '仅限超级管理员使用的安全审计工具。',
    'Block IP': '封禁 IP',
    'Block IP {{ip}}': '封禁 IP {{ip}}',
    'Block registration from {{ip}} for 24 hours? You can unblock it later from IP Blackroom.':
      '封禁来自 {{ip}} 的注册请求 24 小时？之后可在 IP 小黑屋中解除封禁。',
    'Enter a valid IP and duration': '请输入有效的 IP 和封禁时长',
    'Failed to block IP': 'IP 封禁失败',
    'Failed to unblock IP': 'IP 解封失败',
    'IP address': 'IP 地址',
    'IP Blackroom': 'IP 小黑屋',
    'IP blocked successfully': 'IP 封禁成功',
    'IP unblocked successfully': 'IP 解封成功',
    Manual: '手动',
    'Manual block': '手动封禁',
    'Manage manual and automatic registration IP blocks.':
      '管理手动和自动触发的注册 IP 封禁。',
    'No IP bans found': '暂无 IP 封禁记录',
    Permanent: '永久',
    'Search IP bans': '搜索 IP 或原因',
    Unblock: '解封',
  },
  'zh-TW': {
    Automatic: '自動',
    'Request Domain': '請求網域',
    'Security auditing tools restricted to super administrators.':
      '僅限超級管理員使用的安全稽核工具。',
    'Block IP': '封鎖 IP',
    'Block IP {{ip}}': '封鎖 IP {{ip}}',
    'Block registration from {{ip}} for 24 hours? You can unblock it later from IP Blackroom.':
      '封鎖來自 {{ip}} 的註冊請求 24 小時？之後可在 IP 小黑屋中解除封鎖。',
    'Enter a valid IP and duration': '請輸入有效的 IP 和封鎖時長',
    'Failed to block IP': 'IP 封鎖失敗',
    'Failed to unblock IP': 'IP 解除封鎖失敗',
    'IP address': 'IP 位址',
    'IP Blackroom': 'IP 小黑屋',
    'IP blocked successfully': 'IP 封鎖成功',
    'IP unblocked successfully': 'IP 解除封鎖成功',
    Manual: '手動',
    'Manual block': '手動封鎖',
    'Manage manual and automatic registration IP blocks.':
      '管理手動和自動觸發的註冊 IP 封鎖。',
    'No IP bans found': '暫無 IP 封鎖記錄',
    Permanent: '永久',
    'Search IP bans': '搜尋 IP 或原因',
    Unblock: '解除封鎖',
  },
  fr: {
    Automatic: 'Automatique',
    'Request Domain': 'Domaine de requête',
    'Security auditing tools restricted to super administrators.':
      'Outils d’audit de sécurité réservés aux super administrateurs.',
    'Block IP': 'Bloquer l’IP',
    'Block IP {{ip}}': 'Bloquer l’IP {{ip}}',
    'Block registration from {{ip}} for 24 hours? You can unblock it later from IP Blackroom.':
      'Bloquer les inscriptions depuis {{ip}} pendant 24 heures ? Vous pourrez ensuite débloquer cette IP dans la gestion des blocages IP.',
    'Enter a valid IP and duration': 'Saisissez une IP et une durée valides',
    'Failed to block IP': 'Échec du blocage de l’IP',
    'Failed to unblock IP': 'Échec du déblocage de l’IP',
    'IP address': 'Adresse IP',
    'IP Blackroom': 'Blocage IP',
    'IP blocked successfully': 'IP bloquée avec succès',
    'IP unblocked successfully': 'IP débloquée avec succès',
    Manual: 'Manuel',
    'Manual block': 'Blocage manuel',
    'Manage manual and automatic registration IP blocks.':
      'Gérer les blocages d’IP d’inscription manuels et automatiques.',
    'No IP bans found': 'Aucun blocage IP trouvé',
    Permanent: 'Permanent',
    'Search IP bans': 'Rechercher les blocages IP',
    Unblock: 'Débloquer',
  },
  ja: {
    Automatic: '自動',
    'Request Domain': 'リクエストドメイン',
    'Security auditing tools restricted to super administrators.':
      'スーパー管理者専用のセキュリティ監査ツール。',
    'Block IP': 'IP をブロック',
    'Block IP {{ip}}': 'IP {{ip}} をブロック',
    'Block registration from {{ip}} for 24 hours? You can unblock it later from IP Blackroom.':
      '{{ip}} からの登録を 24 時間ブロックしますか？後で IP ブロック管理から解除できます。',
    'Enter a valid IP and duration': '有効な IP と期間を入力してください',
    'Failed to block IP': 'IP のブロックに失敗しました',
    'Failed to unblock IP': 'IP のブロック解除に失敗しました',
    'IP address': 'IP アドレス',
    'IP Blackroom': 'IP ブロック管理',
    'IP blocked successfully': 'IP をブロックしました',
    'IP unblocked successfully': 'IP のブロックを解除しました',
    Manual: '手動',
    'Manual block': '手動ブロック',
    'Manage manual and automatic registration IP blocks.':
      '登録 IP の手動および自動ブロックを管理します。',
    'No IP bans found': 'IP ブロックはありません',
    Permanent: '無期限',
    'Search IP bans': 'IP ブロックを検索',
    Unblock: 'ブロック解除',
  },
  ru: {
    Automatic: 'Автоматически',
    'Request Domain': 'Домен запроса',
    'Security auditing tools restricted to super administrators.':
      'Инструменты аудита безопасности только для суперадминистраторов.',
    'Block IP': 'Заблокировать IP',
    'Block IP {{ip}}': 'Заблокировать IP {{ip}}',
    'Block registration from {{ip}} for 24 hours? You can unblock it later from IP Blackroom.':
      'Заблокировать регистрацию с IP {{ip}} на 24 часа? Позже блокировку можно снять в разделе блокировок IP.',
    'Enter a valid IP and duration': 'Введите корректный IP и срок',
    'Failed to block IP': 'Не удалось заблокировать IP',
    'Failed to unblock IP': 'Не удалось разблокировать IP',
    'IP address': 'IP-адрес',
    'IP Blackroom': 'Блокировка IP',
    'IP blocked successfully': 'IP успешно заблокирован',
    'IP unblocked successfully': 'IP успешно разблокирован',
    Manual: 'Вручную',
    'Manual block': 'Ручная блокировка',
    'Manage manual and automatic registration IP blocks.':
      'Управление ручными и автоматическими блокировками IP при регистрации.',
    'No IP bans found': 'Блокировки IP не найдены',
    Permanent: 'Бессрочно',
    'Search IP bans': 'Поиск блокировок IP',
    Unblock: 'Разблокировать',
  },
  vi: {
    Automatic: 'Tự động',
    'Request Domain': 'Tên miền yêu cầu',
    'Security auditing tools restricted to super administrators.':
      'Công cụ kiểm tra bảo mật chỉ dành cho siêu quản trị viên.',
    'Block IP': 'Chặn IP',
    'Block IP {{ip}}': 'Chặn IP {{ip}}',
    'Block registration from {{ip}} for 24 hours? You can unblock it later from IP Blackroom.':
      'Chặn đăng ký từ {{ip}} trong 24 giờ? Bạn có thể bỏ chặn sau trong phần quản lý chặn IP.',
    'Enter a valid IP and duration': 'Nhập IP và thời hạn hợp lệ',
    'Failed to block IP': 'Không thể chặn IP',
    'Failed to unblock IP': 'Không thể bỏ chặn IP',
    'IP address': 'Địa chỉ IP',
    'IP Blackroom': 'Quản lý chặn IP',
    'IP blocked successfully': 'Đã chặn IP',
    'IP unblocked successfully': 'Đã bỏ chặn IP',
    Manual: 'Thủ công',
    'Manual block': 'Chặn thủ công',
    'Manage manual and automatic registration IP blocks.':
      'Quản lý chặn IP đăng ký thủ công và tự động.',
    'No IP bans found': 'Không tìm thấy IP bị chặn',
    Permanent: 'Vĩnh viễn',
    'Search IP bans': 'Tìm kiếm IP bị chặn',
    Unblock: 'Bỏ chặn',
  },
}

const protectionValues = {
  en: {
    'Registration IP Protection': 'Registration IP Protection',
    'Enable automatic IP blocking': 'Enable automatic IP blocking',
    'Automatically block an IP after repeated successful registrations.':
      'Automatically block an IP after repeated successful registrations.',
    'Registration protection settings saved':
      'Registration protection settings saved',
    'Registration threshold': 'Registration threshold',
    'Successful registrations from one IP before blocking.':
      'Successful registrations from one IP before blocking.',
    'Detection window (hours)': 'Detection window (hours)',
    'Automatic ban duration (hours)': 'Automatic ban duration (hours)',
    'Set to 0 for a permanent ban.': 'Set to 0 for a permanent ban.',
    'Enable registration network protection':
      'Enable registration network protection',
    'Detect rotating proxy registrations by IP, subnet, and optional local ASN data.':
      'Detect rotating proxy registrations by IP, subnet, and optional local ASN data.',
    'Subnet threshold': 'Subnet threshold',
    'Successful registrations from one IPv4 /24 or IPv6 /48 network. Set to 0 to disable.':
      'Successful registrations from one IPv4 /24 or IPv6 /48 network. Set to 0 to disable.',
    'ASN threshold': 'ASN threshold',
    'Successful registrations from one ASN. Set to 0 to disable; use carefully for carrier networks.':
      'Successful registrations from one ASN. Set to 0 to disable; use carefully for carrier networks.',
    'Blocked ASNs': 'Blocked ASNs',
    'Comma-separated ASN numbers, for example: 200373,26548.':
      'Comma-separated ASN numbers, for example: 200373,26548.',
    'Local ASN database available': 'Local ASN database available',
    'Local ASN database unavailable': 'Local ASN database unavailable',
    'Set ASN_DB_PATH to a local GeoLite2-ASN MMDB file and restart the service.':
      'Set ASN_DB_PATH to a local GeoLite2-ASN MMDB file and restart the service.',
  },
  zh: {
    'Registration IP Protection': '注册 IP 防护',
    'Enable automatic IP blocking': '启用自动 IP 封禁',
    'Automatically block an IP after repeated successful registrations.':
      '同一 IP 多次成功注册后自动封禁。',
    'Registration protection settings saved': '注册防护设置已保存',
    'Registration threshold': '注册次数阈值',
    'Successful registrations from one IP before blocking.':
      '同一 IP 达到此成功注册次数后封禁。',
    'Detection window (hours)': '检测窗口（小时）',
    'Automatic ban duration (hours)': '自动封禁时长（小时）',
    'Set to 0 for a permanent ban.': '设置为 0 表示永久封禁。',
    'Enable registration network protection': '启用注册网络防护',
    'Detect rotating proxy registrations by IP, subnet, and optional local ASN data.':
      '通过 IP、网段和可选的本地 ASN 数据识别轮换代理注册。',
    'Subnet threshold': '网段阈值',
    'Successful registrations from one IPv4 /24 or IPv6 /48 network. Set to 0 to disable.':
      '同一 IPv4 /24 或 IPv6 /48 网段的成功注册次数。设置为 0 表示禁用。',
    'ASN threshold': 'ASN 阈值',
    'Successful registrations from one ASN. Set to 0 to disable; use carefully for carrier networks.':
      '同一 ASN 的成功注册次数。设置为 0 表示禁用；运营商网络请谨慎使用。',
    'Blocked ASNs': '封禁 ASN',
    'Comma-separated ASN numbers, for example: 200373,26548.':
      '使用逗号分隔 ASN 编号，例如：200373,26548。',
    'Local ASN database available': '本地 ASN 数据库可用',
    'Local ASN database unavailable': '本地 ASN 数据库不可用',
    'Set ASN_DB_PATH to a local GeoLite2-ASN MMDB file and restart the service.':
      '将 ASN_DB_PATH 指向本地 GeoLite2-ASN MMDB 文件并重启服务。',
  },
  'zh-TW': {
    'Registration IP Protection': '註冊 IP 防護',
    'Enable automatic IP blocking': '啟用自動 IP 封鎖',
    'Automatically block an IP after repeated successful registrations.':
      '同一 IP 多次成功註冊後自動封鎖。',
    'Registration protection settings saved': '註冊防護設定已儲存',
    'Registration threshold': '註冊次數門檻',
    'Successful registrations from one IP before blocking.':
      '同一 IP 達到此成功註冊次數後封鎖。',
    'Detection window (hours)': '偵測視窗（小時）',
    'Automatic ban duration (hours)': '自動封鎖時長（小時）',
    'Set to 0 for a permanent ban.': '設定為 0 表示永久封鎖。',
    'Enable registration network protection': '啟用註冊網路防護',
    'Detect rotating proxy registrations by IP, subnet, and optional local ASN data.':
      '透過 IP、網段和可選的本機 ASN 資料識別輪換代理註冊。',
    'Subnet threshold': '網段門檻',
    'Successful registrations from one IPv4 /24 or IPv6 /48 network. Set to 0 to disable.':
      '同一 IPv4 /24 或 IPv6 /48 網段的成功註冊次數。設定為 0 表示停用。',
    'ASN threshold': 'ASN 門檻',
    'Successful registrations from one ASN. Set to 0 to disable; use carefully for carrier networks.':
      '同一 ASN 的成功註冊次數。設定為 0 表示停用；電信商網路請謹慎使用。',
    'Blocked ASNs': '封鎖 ASN',
    'Comma-separated ASN numbers, for example: 200373,26548.':
      '使用逗號分隔 ASN 編號，例如：200373,26548。',
    'Local ASN database available': '本機 ASN 資料庫可用',
    'Local ASN database unavailable': '本機 ASN 資料庫不可用',
    'Set ASN_DB_PATH to a local GeoLite2-ASN MMDB file and restart the service.':
      '將 ASN_DB_PATH 指向本機 GeoLite2-ASN MMDB 檔案並重新啟動服務。',
  },
  fr: {
    'Registration IP Protection': 'Protection IP des inscriptions',
    'Enable automatic IP blocking': 'Activer le blocage automatique des IP',
    'Automatically block an IP after repeated successful registrations.':
      'Bloquer automatiquement une IP après plusieurs inscriptions réussies.',
    'Registration protection settings saved':
      'Paramètres de protection enregistrés',
    'Registration threshold': 'Seuil d’inscriptions',
    'Successful registrations from one IP before blocking.':
      'Inscriptions réussies depuis une IP avant le blocage.',
    'Detection window (hours)': 'Fenêtre de détection (heures)',
    'Automatic ban duration (hours)': 'Durée du blocage automatique (heures)',
    'Set to 0 for a permanent ban.': '0 signifie un blocage permanent.',
    'Enable registration network protection':
      'Activer la protection réseau des inscriptions',
    'Detect rotating proxy registrations by IP, subnet, and optional local ASN data.':
      'Détecter les inscriptions via des proxys tournants par IP, sous-réseau et données ASN locales facultatives.',
    'Subnet threshold': 'Seuil par sous-réseau',
    'Successful registrations from one IPv4 /24 or IPv6 /48 network. Set to 0 to disable.':
      'Inscriptions réussies depuis un réseau IPv4 /24 ou IPv6 /48. 0 désactive la limite.',
    'ASN threshold': 'Seuil ASN',
    'Successful registrations from one ASN. Set to 0 to disable; use carefully for carrier networks.':
      'Inscriptions réussies depuis un ASN. 0 désactive la limite ; prudence avec les réseaux opérateurs.',
    'Blocked ASNs': 'ASN bloqués',
    'Comma-separated ASN numbers, for example: 200373,26548.':
      'Numéros ASN séparés par des virgules, par exemple : 200373,26548.',
    'Local ASN database available': 'Base ASN locale disponible',
    'Local ASN database unavailable': 'Base ASN locale indisponible',
    'Set ASN_DB_PATH to a local GeoLite2-ASN MMDB file and restart the service.':
      'Pointez ASN_DB_PATH vers un fichier MMDB GeoLite2-ASN local puis redémarrez le service.',
  },
  ja: {
    'Registration IP Protection': '登録 IP 保護',
    'Enable automatic IP blocking': 'IP の自動ブロックを有効化',
    'Automatically block an IP after repeated successful registrations.':
      '同じ IP からの登録成功が続いた場合に自動でブロックします。',
    'Registration protection settings saved': '登録保護設定を保存しました',
    'Registration threshold': '登録回数のしきい値',
    'Successful registrations from one IP before blocking.':
      'ブロックするまでに許可する同一 IP からの登録成功回数。',
    'Detection window (hours)': '検出期間（時間）',
    'Automatic ban duration (hours)': '自動ブロック期間（時間）',
    'Set to 0 for a permanent ban.': '0 にすると永久ブロックになります。',
    'Enable registration network protection': '登録ネットワーク保護を有効化',
    'Detect rotating proxy registrations by IP, subnet, and optional local ASN data.':
      'IP、サブネット、任意のローカル ASN データでローテーションプロキシ登録を検出します。',
    'Subnet threshold': 'サブネットしきい値',
    'Successful registrations from one IPv4 /24 or IPv6 /48 network. Set to 0 to disable.':
      '同一 IPv4 /24 または IPv6 /48 ネットワークからの登録成功回数。0 で無効化します。',
    'ASN threshold': 'ASN しきい値',
    'Successful registrations from one ASN. Set to 0 to disable; use carefully for carrier networks.':
      '同一 ASN からの登録成功回数。0 で無効化します。通信事業者ネットワークでは慎重に使用してください。',
    'Blocked ASNs': 'ブロックする ASN',
    'Comma-separated ASN numbers, for example: 200373,26548.':
      'ASN 番号をカンマ区切りで入力します。例：200373,26548。',
    'Local ASN database available': 'ローカル ASN データベース利用可能',
    'Local ASN database unavailable': 'ローカル ASN データベース利用不可',
    'Set ASN_DB_PATH to a local GeoLite2-ASN MMDB file and restart the service.':
      'ASN_DB_PATH にローカルの GeoLite2-ASN MMDB ファイルを指定し、サービスを再起動してください。',
  },
  ru: {
    'Registration IP Protection': 'Защита IP при регистрации',
    'Enable automatic IP blocking': 'Включить автоматическую блокировку IP',
    'Automatically block an IP after repeated successful registrations.':
      'Автоматически блокировать IP после нескольких успешных регистраций.',
    'Registration protection settings saved':
      'Настройки защиты регистрации сохранены',
    'Registration threshold': 'Порог регистраций',
    'Successful registrations from one IP before blocking.':
      'Число успешных регистраций с одного IP до блокировки.',
    'Detection window (hours)': 'Окно обнаружения (часы)',
    'Automatic ban duration (hours)': 'Срок автоматической блокировки (часы)',
    'Set to 0 for a permanent ban.': '0 означает бессрочную блокировку.',
    'Enable registration network protection':
      'Включить сетевую защиту регистрации',
    'Detect rotating proxy registrations by IP, subnet, and optional local ASN data.':
      'Обнаруживать регистрации через сменяемые прокси по IP, подсети и необязательной локальной базе ASN.',
    'Subnet threshold': 'Порог подсети',
    'Successful registrations from one IPv4 /24 or IPv6 /48 network. Set to 0 to disable.':
      'Успешные регистрации из одной сети IPv4 /24 или IPv6 /48. 0 отключает ограничение.',
    'ASN threshold': 'Порог ASN',
    'Successful registrations from one ASN. Set to 0 to disable; use carefully for carrier networks.':
      'Успешные регистрации из одной ASN. 0 отключает ограничение; осторожно для сетей операторов.',
    'Blocked ASNs': 'Заблокированные ASN',
    'Comma-separated ASN numbers, for example: 200373,26548.':
      'Номера ASN через запятую, например: 200373,26548.',
    'Local ASN database available': 'Локальная база ASN доступна',
    'Local ASN database unavailable': 'Локальная база ASN недоступна',
    'Set ASN_DB_PATH to a local GeoLite2-ASN MMDB file and restart the service.':
      'Укажите в ASN_DB_PATH локальный файл GeoLite2-ASN MMDB и перезапустите сервис.',
  },
  vi: {
    'Registration IP Protection': 'Bảo vệ IP đăng ký',
    'Enable automatic IP blocking': 'Bật chặn IP tự động',
    'Automatically block an IP after repeated successful registrations.':
      'Tự động chặn IP sau nhiều lần đăng ký thành công.',
    'Registration protection settings saved': 'Đã lưu cài đặt bảo vệ đăng ký',
    'Registration threshold': 'Ngưỡng đăng ký',
    'Successful registrations from one IP before blocking.':
      'Số lần đăng ký thành công từ một IP trước khi chặn.',
    'Detection window (hours)': 'Khoảng thời gian phát hiện (giờ)',
    'Automatic ban duration (hours)': 'Thời hạn chặn tự động (giờ)',
    'Set to 0 for a permanent ban.': 'Đặt 0 để chặn vĩnh viễn.',
    'Enable registration network protection': 'Bật bảo vệ mạng khi đăng ký',
    'Detect rotating proxy registrations by IP, subnet, and optional local ASN data.':
      'Phát hiện đăng ký qua proxy luân phiên bằng IP, mạng con và dữ liệu ASN cục bộ tùy chọn.',
    'Subnet threshold': 'Ngưỡng mạng con',
    'Successful registrations from one IPv4 /24 or IPv6 /48 network. Set to 0 to disable.':
      'Số đăng ký thành công từ một mạng IPv4 /24 hoặc IPv6 /48. Đặt 0 để tắt.',
    'ASN threshold': 'Ngưỡng ASN',
    'Successful registrations from one ASN. Set to 0 to disable; use carefully for carrier networks.':
      'Số đăng ký thành công từ một ASN. Đặt 0 để tắt; thận trọng với mạng nhà cung cấp.',
    'Blocked ASNs': 'ASN bị chặn',
    'Comma-separated ASN numbers, for example: 200373,26548.':
      'Các số ASN phân tách bằng dấu phẩy, ví dụ: 200373,26548.',
    'Local ASN database available': 'Cơ sở dữ liệu ASN cục bộ khả dụng',
    'Local ASN database unavailable': 'Cơ sở dữ liệu ASN cục bộ không khả dụng',
    'Set ASN_DB_PATH to a local GeoLite2-ASN MMDB file and restart the service.':
      'Đặt ASN_DB_PATH tới tệp GeoLite2-ASN MMDB cục bộ rồi khởi động lại dịch vụ.',
  },
}

for (const [locale, additions] of Object.entries(protectionValues)) {
  Object.assign(values[locale], additions)
}

const ssrfLinkValues = {
  en: {
    'Also block outbound SSRF access': 'Also block outbound SSRF access',
    SSRF: 'SSRF',
    'Outbound SSRF blocking': 'Outbound SSRF blocking',
    Enabled: 'Enabled',
    Disabled: 'Disabled',
  },
  zh: {
    'Also block outbound SSRF access': '同时阻止服务器通过 SSRF 访问',
    SSRF: 'SSRF',
    'Outbound SSRF blocking': '出站 SSRF 封禁',
    Enabled: '已启用',
    Disabled: '未启用',
  },
  'zh-TW': {
    'Also block outbound SSRF access': '同時阻止伺服器透過 SSRF 存取',
    SSRF: 'SSRF',
    'Outbound SSRF blocking': '出站 SSRF 封鎖',
    Enabled: '已啟用',
    Disabled: '未啟用',
  },
  fr: {
    'Also block outbound SSRF access': 'Bloquer aussi l’accès SSRF sortant',
    SSRF: 'SSRF',
    'Outbound SSRF blocking': 'Blocage SSRF sortant',
    Enabled: 'Activé',
    Disabled: 'Désactivé',
  },
  ja: {
    'Also block outbound SSRF access': '外向き SSRF アクセスもブロック',
    SSRF: 'SSRF',
    'Outbound SSRF blocking': '外向き SSRF ブロック',
    Enabled: '有効',
    Disabled: '無効',
  },
  ru: {
    'Also block outbound SSRF access':
      'Также блокировать исходящий SSRF-доступ',
    SSRF: 'SSRF',
    'Outbound SSRF blocking': 'Блокировка исходящего SSRF',
    Enabled: 'Включено',
    Disabled: 'Отключено',
  },
  vi: {
    'Also block outbound SSRF access': 'Đồng thời chặn truy cập SSRF đi',
    SSRF: 'SSRF',
    'Outbound SSRF blocking': 'Chặn SSRF đi',
    Enabled: 'Đã bật',
    Disabled: 'Đã tắt',
  },
}

for (const [locale, additions] of Object.entries(ssrfLinkValues)) {
  Object.assign(values[locale], additions)
}

const paymentAmountErrorValues = {
  en: {
    'Failed to calculate payment amount': 'Failed to calculate payment amount',
    'top-up quota limit exceeded':
      'Your balance plus this top-up exceeds the account limit',
  },
  zh: {
    'Failed to calculate payment amount': '计算支付金额失败',
    'top-up quota limit exceeded': '当前余额加上本次充值额度超过账户上限',
  },
  'zh-TW': {
    'Failed to calculate payment amount': '計算付款金額失敗',
    'top-up quota limit exceeded': '目前餘額加上本次儲值額度超過帳戶上限',
  },
  fr: {
    'Failed to calculate payment amount': 'Échec du calcul du montant à payer',
    'top-up quota limit exceeded':
      'Votre solde ajouté à cette recharge dépasse la limite du compte',
  },
  ja: {
    'Failed to calculate payment amount': '支払い金額を計算できませんでした',
    'top-up quota limit exceeded':
      '現在の残高と今回のチャージ額の合計がアカウント上限を超えています',
  },
  ru: {
    'Failed to calculate payment amount': 'Не удалось рассчитать сумму платежа',
    'top-up quota limit exceeded':
      'Баланс с учетом этого пополнения превышает лимит аккаунта',
  },
  vi: {
    'Failed to calculate payment amount': 'Không thể tính số tiền thanh toán',
    'top-up quota limit exceeded':
      'Số dư cộng với khoản nạp này vượt quá giới hạn tài khoản',
  },
}

for (const [locale, additions] of Object.entries(paymentAmountErrorValues)) {
  Object.assign(values[locale], additions)
}

const rankingsAdminValues = {
  en: {
    'Only administrators can view rankings':
      'Only administrators can view rankings',
    'When enabled, only administrators can open the rankings page and access its data.':
      'When enabled, only administrators can open the rankings page and access its data.',
  },
  zh: {
    'Only administrators can view rankings': '仅管理员可查看排行榜',
    'When enabled, only administrators can open the rankings page and access its data.':
      '启用后，只有管理员可以打开排行榜页面并访问其数据。',
  },
  'zh-TW': {
    'Only administrators can view rankings': '僅管理員可查看排行榜',
    'When enabled, only administrators can open the rankings page and access its data.':
      '啟用後，只有管理員可以開啟排行榜頁面並存取其資料。',
  },
  fr: {
    'Only administrators can view rankings':
      'Réserver le classement aux administrateurs',
    'When enabled, only administrators can open the rankings page and access its data.':
      'Lorsque cette option est activée, seuls les administrateurs peuvent ouvrir le classement et accéder à ses données.',
  },
  ja: {
    'Only administrators can view rankings': 'ランキングを管理者のみに表示',
    'When enabled, only administrators can open the rankings page and access its data.':
      '有効にすると、管理者だけがランキングページを開いてデータにアクセスできます。',
  },
  ru: {
    'Only administrators can view rankings':
      'Показывать рейтинг только администраторам',
    'When enabled, only administrators can open the rankings page and access its data.':
      'Если включено, открыть страницу рейтинга и получить доступ к ее данным смогут только администраторы.',
  },
  vi: {
    'Only administrators can view rankings':
      'Chỉ quản trị viên được xem bảng xếp hạng',
    'When enabled, only administrators can open the rankings page and access its data.':
      'Khi bật, chỉ quản trị viên mới có thể mở trang bảng xếp hạng và truy cập dữ liệu.',
  },
}

for (const [locale, additions] of Object.entries(rankingsAdminValues)) {
  Object.assign(values[locale], additions)
}

for (const [locale, additions] of Object.entries(values)) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(await fs.readFile(file, 'utf8'))
  Object.assign(json.translation, additions)
  json.translation = Object.fromEntries(
    Object.entries(json.translation).sort(([a], [b]) => a.localeCompare(b))
  )
  await fs.writeFile(file, `${JSON.stringify(json, null, 2)}\n`)
}
