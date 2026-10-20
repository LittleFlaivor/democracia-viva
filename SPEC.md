# ESPECIFICACIÓN TÉCNICA FORMAL: PLATAFORMA CÍVICA DEMOCRACIA VIVA
**Versión:** 3.0.0-PROD (Zero-PII Atomic Ballot Box & Zero Custom Crypto Standard)  
**Dominio Oficial:** `democraciaviva.es` (`democracia-viva-es.web.app`)  
**Estándar Regulatorio:** RGPD (Reglamento UE 2016/679) & eIDAS (Reglamento UE 910/2014)  
**Principios Básicos:** Cero Criptografía Propietaria / Estándares W3C WebAuthn (`@simplewebauthn`) / Urna Atómica Desacoplada sin Metadatos Forenses

---

## 1. PRINCIPIO GENERAL: CERO CRIPTOGRAFÍA CASERA (ZERO CUSTOM CRYPTO)

Todas las primitivas criptográficas y de autenticación empleadas en **Democracia Viva** provienen de estándares abiertos auditados y librerías homologadas internacionalmente:
- **Autenticación WebAuthn / Passkeys:** `@simplewebauthn/browser` y `@simplewebauthn/server` (W3C WebAuthn Level 3 / FIDO2).
- **Funciones Criptográficas Hash y Firma:** API estándar Web Standards `crypto.subtle` (navegadores modernos) y `node:crypto` (servidor), con curvas y algoritmos canónicos (SHA-256, HMAC-SHA-256, ECDSA P-256).
- **Garantías de Transacción Atómica:** Motores de base de datos distribuidos ACID (Google Cloud Firestore en producción y Sandbox atómico en memoria), aplicando transacciones atómicas de dos fases con índices de unicidad estrictos.

---

## 2. ARQUITECTURA DE SEGURIDAD BASADA EN ESTÁNDARES

### A. Verificación de Elegibilidad (+18 y Unicidad) + WebAuthn Oficial

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               1. CONECTOR MODULAR DE IDENTIDAD HOMOLOGADO (Zero-PII)                   │
│   Proveedor Externo Certificado (Didit / Stripe Identity / Cl@ve eIDAS / NFC DNIe)     │
│   Webhooks con firma criptográfica HMAC-SHA256 (KMS secret)                           │
│   - Recepción: { is_adult_18: true, signature, nullifier_token }                       │
│   - Cero Almacenamiento PII: NUNCA se guardan nombres, fotos, números de DNI ni IPs    │
│   - Derivación: citizen_nullifier_hash = HMAC-SHA256(nullifier_token, PEPPER_SECRET)    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│           2. VINCULACIÓN HARDWARE PASSEKEY (1 CIUDADANO = 1 DISPOSITIVO ACTIVO)       │
│   - Registro mediante @simplewebauthn (W3C FIDO2 / Secure Enclave / TPM)               │
│   - Registro central: map[citizen_nullifier_hash] = { credential_id, public_key }     │
│   - REGLA ATÓMICA DE MIGRACIÓN: Si el mismo nullifier registra un nuevo dispositivo,   │
│     se revoca automáticamente la credencial previa. 1 solo derecho de voto activo.    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Conector de Identidad Modular (`IdentityProviderAdapter`):**
   - Interfaz extensible conectada mediante webhooks autenticados o flujo OIDC con pasarelas de identidad certificadas bajo normativa eIDAS (Didit KYC, Stripe Identity o Cl@ve).
   - **Garantía Zero-PII:** La plataforma jamás recibe ni almacena datos personales de carácter identitario (ni nombres, ni apellidos, ni imágenes de rostro, ni número de documento).
   - El payload recibido se limita a la verificación binaria `is_adult_18: true`, la firma criptográfica del proveedor y un token determinista del que se deriva el `citizen_nullifier_hash` mediante HMAC-SHA-256 con pimienta de servidor custodiada en KMS.

2. **Autenticación Biométrica Diaria (`@simplewebauthn` / Passkeys Hardware):**
   - Vinculación directa con el sensor biométrico del teléfono móvil (Touch ID, Face ID, Windows Hello) a través de credenciales WebAuthn ES256 (ECDSA P-256).
   - La clave privada jamás abandona el chip de seguridad (Secure Enclave / TPM).
   - **Regla de Dispositivo Único Activo:** `1 Ciudadano = 1 Dispositivo Activo`. La reautenticación desde un nuevo terminal revoca de forma atómica e irreversible la credencial del dispositivo anterior.

---

### B. Secreto del Voto y Protección Anti-Manipulación por Separación Atómica (Censo ↔ Urna)

La emisión de cada voto se procesa a través de una **Transacción Atómica de Base de Datos** que opera sobre dos estructuras estrictamente aisladas sin claves foráneas ni referencias cruzadas:

```
                  ┌──────────────────────────────────────────────┐
                  │          CIUDADANO AUTENTICADO               │
                  │  1. Genera voter_secret_salt (128 bits local)│
                  │  2. commitment_hash = SHA-256(cid:voto:salt) │
                  │  3. Firma aserción WebAuthn(cid)            │
                  └───────────────┬──────────────┬───────────────┘
                                  │              │
                   Transacción    │              │  Transacción
                   Atómica A      │              │  Atómica B
                                  ▼              ▼
┌────────────────────────────────────────────┐ ┌────────────────────────────────────────────┐
│         ESTRUCTURA 1: CENSO               │ │         ESTRUCTURA 2: URNA ANÓNIMA         │
│        (Participation_Roll)                │ │           (Anonymous_Ballot_Box)           │
│                                            │ │                                            │
│ • roll_id: SHA-256(cid || nullifier)       │ │ • Colección Sharded: shard_00..shard_09    │
│ • consultation_id: "ley-vivienda"          │ │ • ballots_map[receipt_code]:               │
│ • citizen_nullifier_hash: "0x4f8a..."      │ │     {                                      │
│ • status: "VOTED_DIRECT"                   │ │       receipt_code: "#DV-7A2B-9C1D",       │
│ • webauthn_assertion_signature: "3045..."  │ │       vote_choice: "YES",                  │
│ • hour_bucket: "2026-10-21T01:00:00Z"      │ │       commitment_hash: "8e3b5a..."        │
│                                            │ │     }                                      │
│ [ÍNDICE ÚNICO: (consultation_id, nullifier)│ │ [ORDEN ALFABÉTICO EN DISCO POR RECEIPT_CODE│
│  => IMPOSIBLE VOTAR DOS VECES]             │ │  CERO TIMESTAMP INDIVIDUAL, CERO IP,       │
│ [FIRMA HARDWARE OBLIGATORIA               │ │  CERO NULLIFIER O REFERENCIA AL CENSO]     │
│  => IMPOSIBLE INYECTAR VOTOS FALSOS]       │ └─────────────────────┬──────────────────────┘
└─────────────────────┬──────────────────────┘                       │
                      │                                              │
                      └──────────────────────┐                       │
                                             ▼                       ▼
                            ┌─────────────────────────────────────────────────┐
                            │          INVARIANTE PÚBLICO DE CUADRE           │
                            │                                                 │
                            │  COUNT(Participation_Roll                       │
                            │        WHERE status == 'VOTED_DIRECT')          │
                            │                   ===                           │
                            │  COUNT(Anonymous_Ballot_Box)                    │
                            │                                                 │
                            │  *Cualquier desajuste activa ALERTA AUDITABLE*  │
                            └─────────────────────────────────────────────────┘
```

1. **Estructura 1: Censo de Participación (`Participation_Roll`):**
   - **Campos:** `roll_id`, `consultation_id`, `citizen_nullifier_hash`, `status` (`VOTED_DIRECT` | `DELEGATED`), `webauthn_assertion_signature`, `hour_bucket` (redondeado a la hora para romper correlación temporal).
   - **Restricción de Unicidad:** Índice compuesto único `(consultation_id, citizen_nullifier_hash)`. Todo intento de voto repetido es rechazado a nivel de motor transaccional.
   - **Prevención de Inyección (Anti-Ballot Stuffing):** Cada registro exige una firma criptográfica de aserción WebAuthn generada en hardware por el teléfono del ciudadano. Ni un administrador con acceso a la base de datos puede inyectar votantes fantasma sin la firma hardware.

2. **Estructura 2: Urna Secreta Anti-Forense (`Anonymous_Ballot_Box`):**
   - **Eliminación de Metadatos Temporales (`_createTime`):** Para evitar análisis forenses por orden de creación, al crear la consulta se pre-crean documentos contenedores (*Shards*). Cada voto se inserta como una entrada en un mapa indexado por el código de recibo (`ballots_map[receipt_code]`), quedando ordenado alfabéticamente en disco sin marcas de tiempo individuales.
   - **PROHIBICIÓN ESTRICTA:** Queda terminantemente prohibido almacenar `citizen_nullifier_hash`, identificadores de usuario, direcciones IP o marcas de tiempo precisas dentro de la urna.

3. **Recibo a Prueba de Manipulación con Sal Local (Compromiso Criptográfico):**
   - En el navegador del ciudadano, se genera una sal aleatoria criptográfica local de 128 bits (`voter_secret_salt`), que permanece únicamente en el `localStorage` del dispositivo móvil.
   - Se calcula mediante WebCrypto:
     $$\text{commitment\_hash} = \text{SHA-256}(\text{consultation\_id} \parallel \text{":"} \parallel \text{vote\_choice} \parallel \text{":"} \parallel \text{voter\_secret\_salt})$$
   - La urna almacena `{ receipt_code: "#DV-XXXX-XXXX", vote_choice, commitment_hash }`.
   - **Garantía Inmutable:** Si un atacante altera `vote_choice` en la base de datos, el `commitment_hash` fallará al ser verificado contra la sal local custodiada en el móvil del ciudadano, disparando una alerta instantánea de fraude electoral.

4. **Invariante Público de Cuadre Contable:**
   - La plataforma audita y muestra públicamente en tiempo real:
     $$\text{COUNT}(\text{Participation\_Roll}_{\text{VOTED\_DIRECT}}) \equiv \text{COUNT}(\text{Anonymous\_Ballot\_Box})$$
   - Si existiera una sola aserción sin papeleta o una sola papeleta sin aserción hardware en el censo, el sistema entra en estado de `ALERTA DE AUDITORÍA PÚBLICA`.

---

### C. Democracia Líquida Segura (Dynamic Rollup)

- **Delegación Temática:** El ciudadano puede delegar su representación por categorías (Vivienda, Economía, Sanidad, Empleo, etc.) en perfiles de Especialistas Verificados.
- **Validación de Ciclos (DAG):** Comprobación en grafo dirigida para impedir bucles de delegación ($A \to B \to C \to A$) mediante búsqueda en profundidad (DFS).
- **Cómputo Dinámico del Peso Efectivo:**
  * Los votos de los especialistas son públicos.
  * Su peso efectivo (`effective_weight`) se calcula dinámicamente sumando a los delegadores que permanecen en estado `DELEGATED`.
  * **Hot-Override (Prevalencia del Voto Directo):** Si un ciudadano que delegó decide votar directamente en una propuesta específica, su estado en el Censo pasa de `DELEGATED` a `VOTED_DIRECT`, descontándose de forma automática e inmediata del peso del especialista para esa votación concreta.

---

## 3. AISLAMIENTO FÍSICO DE ENTORNOS (PROD vs. SANDBOX)

Para evitar cualquier contaminación de datos reales con pruebas de desarrollo o auditoría:
1. **Separación de Colecciones Físicas en Base de Datos:**
   - **Producción:** `prod_participation_roll`, `prod_ballot_box`, `prod_specialists`.
   - **Simulación:** `sandbox_participation_roll`, `sandbox_ballot_box`, `sandbox_specialists`.
2. **Consola Táctica del Simulador Sandbox:**
   - **Simulador de Identidad y Casos Borde (1-Click):**
     * *Adulto Válido (+18):* Alta exitosa con Passkey real/virtual.
     * *Menor de Edad (<18):* Bloqueo regulatorio inmediato (`UNDER_18_BLOCKED`).
     * *Migración de Móvil (Mismo DNI):* Revocación del dispositivo anterior y conservación de 1 único derecho de voto.
     * *Intento de Doble Voto:* Bloqueado por índice de unicidad en el Censo.
     * *Simulador de Manipulación de Base de Datos:* Botón interactivo que intenta alterar un voto en la urna o inyectar un voto sin firma WebAuthn, demostrando en vivo las alarmas de `commitment_hash` y de cuadre contable.
   - **Generador de Tráfico en Lotes (`Batch Vote Simulator`):** Inyección de 10, 50 o 100 votantes simultáneos, cálculo dinámico de escaños/porcentajes y botón **"Reset Sandbox"** para vaciar a cero el entorno de prueba.

---

## 4. CENTRO DE CONTROL ZERO-TRUST (`/admin`)

La consola de administración dispone de 5 módulos técnicos con diseño de alta precisión (Linear / Stripe style):
1. **Monitor de Censo Anónimo y Seguridad:** Métricas en vivo de nullifiers activos, credenciales Passkey registradas y revocadas, rechazos interceptados (menores, duplicados) y estado del conector eIDAS/KYC.
2. **BOE Studio & Generador IA (Gemini / Ollama + Qwen 2.5):** Ingesta estructurada de boletines oficiales bajo JSON Schema estricto. Editor comparativo paralelo con previsualización móvil en **100dvh** y monográfico pedagógico.
3. **Urna Secreta y Auditoría de Integridad:** Monitor del Invariante Contable (`Firmas Censo == Papeletas Urna`), buscador de recibos `#DV-XXXX-XXXX` con verificación de sal y exportación de actas firmadas SHA-256.
4. **Red de Especialistas (Grafo DAG de Delegación Líquida):** Gestión de especialistas por categoría y mapa visual interactivo SVG de flujos de delegación y pesos acumulados.
5. **Laboratorio Sandbox:** Consola de inyección de pruebas adversarias y ejecución de suites de seguridad en tiempo real.

---

## 5. ESTÁNDARES VISUALES Y ERGONOMÍA (AWWWARDS / LINEAR)

1. **Ergonomía Móvil Ciudadana:** Interfaz confinada estrictamente a **100dvh Zero-Scroll** para dispositivos de $375\text{px}$, con botones de decisión accesibles con el pulgar (WCAG 2.1 AA) y micro-animaciones sin bloqueo.
2. **Diseño Editorial Suizo:** Fondo grafito cálido `#0A0B09`, tipografías modernas (*Plus Jakarta Sans*, *Outfit*, *JetBrains Mono*), acentos ámbar `#EBA43C`, esmeralda `#43C08F` y carmesí `#EA5A43`.
3. **Documentación Visual Interactiva:** Archivo raíz `app-architecture-status.html` con diagramas vectoriales SVG explicativos del desacoplamiento de la urna, el recibo con sal y el invariante contable.
