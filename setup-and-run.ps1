# Ensure execution policy allows colored host output and standard operations
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     Smart Parking UTN - Script de Inicialización        " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verificar si Docker está corriendo
docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker no está ejecutándose. Por favor abrí Docker Desktop e intentalo de nuevo." -ForegroundColor Red
    Exit 1
}

# 2. Verificar carpetas de datos locales
$neo4j_exists = Test-Path "./neo4j-data"
$cassandra_exists = Test-Path "./cassandra-data"

if (-not $neo4j_exists -or -not $cassandra_exists) {
    Write-Host "[INFO] Preparando migración de datos para conservar tu estado actual..." -ForegroundColor Cyan
    
    # Detener contenedores si existen
    Write-Host "[1/3] Deteniendo bases de datos actuales de forma segura..." -ForegroundColor Yellow
    $neo_exists_active = docker ps -a --filter "name=neo4j-utn-final-ok" --format "{{.Names}}"
    $cass_exists_active = docker ps -a --filter "name=cassandra-utn" --format "{{.Names}}"
    
    if ($neo_exists_active -or $cass_exists_active) {
        docker stop neo4j-utn-final-ok cassandra-utn >$null 2>&1
    }
    
    # Copiar datos
    Write-Host "[2/3] Copiando datos a directorios locales del proyecto..." -ForegroundColor Yellow
    if (-not $neo4j_exists) {
        if ($neo_exists_active) {
            Write-Host "   -> Copiando datos de Neo4j..." -ForegroundColor DarkGray
            docker cp neo4j-utn-final-ok:/data ./neo4j-data
        } else {
            Write-Host "   [ADVERTENCIA] No se encontró el contenedor neo4j-utn-final-ok. Neo4j iniciará vacío." -ForegroundColor Yellow
        }
    }
    
    if (-not $cassandra_exists) {
        if ($cass_exists_active) {
            Write-Host "   -> Copiando datos de Cassandra..." -ForegroundColor DarkGray
            docker cp cassandra-utn:/var/lib/cassandra ./cassandra-data
        } else {
            Write-Host "   [ADVERTENCIA] No se encontró el contenedor cassandra-utn. Cassandra iniciará vacío." -ForegroundColor Yellow
        }
    }
    
    # Eliminar contenedores viejos para liberar puertos
    Write-Host "[3/3] Removiendo contenedores obsoletos para liberar puertos..." -ForegroundColor Yellow
    if ($neo_exists_active -or $cass_exists_active) {
        docker rm neo4j-utn-final-ok cassandra-utn >$null 2>&1
    }
    
    Write-Host "[SUCCESS] Migración y copia de datos local completada con éxito." -ForegroundColor Green
} else {
    Write-Host "[INFO] Las carpetas de datos locales (neo4j-data y cassandra-data) ya existen." -ForegroundColor Green
    
    # Por seguridad, si quedan restos de contenedores anteriores sin compose, los limpiamos
    $neo_exists_active = docker ps -a --filter "name=neo4j-utn-final-ok" --format "{{.Names}}"
    $cass_exists_active = docker ps -a --filter "name=cassandra-utn" --format "{{.Names}}"
    if ($neo_exists_active -or $cass_exists_active) {
        Write-Host "[INFO] Limpiando contenedores huérfanos antiguos..." -ForegroundColor DarkGray
        docker stop neo4j-utn-final-ok cassandra-utn >$null 2>&1
        docker rm neo4j-utn-final-ok cassandra-utn >$null 2>&1
    }
}

# 3. Levantar la nueva estructura con Docker Compose
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[INFO] Construyendo e iniciando toda la aplicación en Docker..." -ForegroundColor Cyan
docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Hubo un error al ejecutar 'docker compose up'." -ForegroundColor Red
    Exit 1
}

# 4. Esperar y monitorear el arranque
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[INFO] Esperando a que las bases de datos y la aplicación estén listas..." -ForegroundColor Cyan
Write-Host "Nota: La primera vez la compilación de la imagen de Java y React puede demorar unos minutos." -ForegroundColor Gray

$timeout = 300 # 5 minutos máximo para primer build
$elapsed = 0
$success = $false

while ($elapsed -lt $timeout) {
    $backend_status = docker compose ps smart-parking-backend --format "{{.State}}"
    $frontend_status = docker compose ps smart-parking-frontend --format "{{.State}}"
    
    if ($backend_status -eq "running" -and $frontend_status -eq "running") {
        $success = $true
        break
    }
    
    Start-Sleep -Seconds 5
    $elapsed += 5
    Write-Host "   -> Compilando / Levantando servicios... ($elapsed s)" -ForegroundColor Gray
}

Write-Host "==========================================================" -ForegroundColor Cyan
if ($success) {
    Write-Host "   ¡FELICITACIONES! Todo el sistema se levantó con éxito.   " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "Ya podés acceder a la aplicación en tu notebook:" -ForegroundColor White
    Write-Host "  -> Frontend Web:  http://localhost:3000" -ForegroundColor Green
    Write-Host "  -> Backend API:   http://localhost:8080/api" -ForegroundColor Green
    Write-Host "  -> Neo4j Console: http://localhost:7474  (Usuario: neo4j / Contraseña: password123)" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "Para detener el sistema cuando termines, podés correr: docker compose down" -ForegroundColor Yellow
} else {
    Write-Host "[WARNING] El tiempo de espera expiró, pero los servicios se están compilando en segundo plano." -ForegroundColor Yellow
    Write-Host "Podés comprobar el estado corriendo: docker compose ps" -ForegroundColor White
}
