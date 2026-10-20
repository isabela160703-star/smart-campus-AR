# Genera una CA local y un certificado de servidor con OpenSSL dentro de Docker.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\gen-certs.ps1 -Ip 192.168.100.11
# Salida:
#   certs/rootCA.crt     -> instalar en el celular (Certificado de CA)
#   certs/rootCA.key     -> clave de la CA (¡no compartir!)
#   certs/server.crt     -> certificado del servidor
#   certs/server.key     -> clave del servidor
param(
  [Parameter(Mandatory = $true)]
  [string]$Ip
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$certs = Join-Path $root "certs"
New-Item -ItemType Directory -Force -Path $certs | Out-Null

$conf = @"
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
x509_extensions    = v3_ca

[dn]
C  = MX
ST = CDMX
L  = CDMX
O  = SmartCampus Local CA
CN = SmartCampus Local CA

[v3_ca]
basicConstraints = critical,CA:TRUE
keyUsage         = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash

[server_ext]
basicConstraints = CA:FALSE
keyUsage         = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName   = @alt_names

[alt_names]
IP.1  = $Ip
IP.2  = 127.0.0.1
DNS.1 = localhost
"@

Set-Content -Path (Join-Path $certs "openssl.cnf") -Value $conf -Encoding ASCII

Write-Host "Generando CA y certificado para IP $Ip ..." -ForegroundColor Cyan

# Todo el trabajo ocurre dentro de un contenedor efimero con openssl (sin instalar nada en el PC)
docker run --rm -v "${certs}:/certs" alpine:3.19 sh -c "
set -e
apk add --no-cache openssl >/dev/null 2>&1
cd /certs

# 1) Clave y certificado de la CA local
openssl genrsa -out rootCA.key 2048
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 \
  -out rootCA.crt -config openssl.cnf -extensions v3_ca

# 2) Clave y CSR del servidor
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -config openssl.cnf \
  -subj '/C=MX/ST=CDMX/L=CDMX/O=SmartCampus/CN=$Ip'

# 3) Firmar el certificado del servidor con la CA (con SAN para la IP)
openssl x509 -req -in server.csr -CA rootCA.crt -CAkey rootCA.key \
  -CAcreateserial -out server.crt -days 3650 -sha256 \
  -extfile openssl.cnf -extensions server_ext

rm -f server.csr rootCA.srl
"

Write-Host "Listo. Certificados en: $certs" -ForegroundColor Green
Get-ChildItem $certs | Select-Object Name, Length
