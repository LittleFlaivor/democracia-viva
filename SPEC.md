# ESPECIFICACIÓN TÉCNICA FORMAL: PROTOCOLO DEMOCRACIA VIVA
**Versión:** 2.0.0-PROD (Zero-Trust Cryptographic Civic Platform)  
**Dominio:** `democraciaviva.es`  
**Arquitectura:** Capa de Dominio Criptográfico Puro (Funciones Deterministas sin Estado UI) ↔ Capa de Estado e Interfaz Reactiva  
**Estándar de Verificabilidad:** Censo Desacoplado de la Urna mediante Firmas Ciegas (RSA-FDH / Chaum) + Árbol de Merkle SHA-256 + Sellado de Tiempo RFC 3161 (Sin Blockchain / Sin Web3)

---

## 1. PRINCIPIO ARQUITECTÓNICO: SEPARACIÓN DE CAPAS

El sistema separa estrictamente dos capas impermeables:
1. **Capa de Dominio Criptográfico (`src/domain/civic/`):**
   - Funciones puras, deterministas y libres de efectos secundarios del DOM o APIs propietarias de interfaz.
   - Total compatibilidad isomórfica (Node.js 22+ y navegadores modernos mediante Web Standards y `@noble/hashes`).
   - Gestión estricta de memoria efímera: destrucción de PII en RAM en $< 50\text{ ms}$.
2. **Capa de Estado e Interfaz Reactiva (`src/ui/`, `src/state/`, `src/admin/`):**
   - Interfaz táctil reactiva con diseño editorial suizo (Linear / Stripe / Awwwards Standard).
   - Panel de administración Zero-Trust con vistas basadas en modelos de solo lectura agregados (`AdminReadModel`).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CAPA 1: CENSO Y ELEGIBILIDAD EFÍMERA (+18)                      │
│   Lectura DNIe NFC (ICAO 9303 / PACE CAN) ──> RAM Servidor (Cero PII en disco)         │
│   a) Verificación CSCA Policía sobre EF.SOD y DG1 (edad >= 18, vigencia doc)           │
│   b) Autenticación Activa DG15: firma chip de SHA-256(Nonce || PasskeyPub || Ts)       │
│   c) Cotejo biométrico DG2 local en cliente (atestación de presencia humana)           │
│   d) Nullifier_ID = Argon2id(DNI, KMS_Pepper_256) ──> Purga PII en < 50ms             │
│   e) Regla de Unicidad: 1 Nullifier = 1 Passkey activa (nuevo registro revoca previa) │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
               Petición de Token Ciego      │  Token Cegado m·r^e mod n
               firmada con WebAuthn         ▼  firmado por el Censo sin ver el contenido
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                 CAPA 2: DESACOPLAMIENTO CENSO ↔ URNA (FIRMAS CIEGAS)                  │
│   Cliente solicita firma ciega al Censo: Estado AVAILABLE ──> BLIND_TOKEN_ISSUED       │
│   Cliente desenmascara firma: s = s' · r^-1 mod n                                     │
│   Depósito en Urna con Jitter Temporal Aleatorio (Cero logs de IP, Cero metadatos)    │
└─────────────────────┬───────────────────────────────────────────────────┬──────────────┘
                      │                                                   │
     Si no vota directo: delega por tema                                  │ Papeleta anónima
     en especialista verificado                                           │ (Serial, Firma,
                      ▼                                                   │  Salt, Choice)
┌────────────────────────────────────────────────┐                        │
│   CAPA 3: GRAFO DE DEMOCRACIA LÍQUIDA (DAG)    │                        │
│   - Delegación por categoría (Vivienda, etc.)  │                        ▼
│   - Prevención estricta de bucles (DFS)        │ ┌─────────────────────────────────────┐
│   - Hot-Override: Voto directo anula delegación│ │    CAPA 4: URNA CRIPTOGRÁFICA Y     │
│   - Especialistas votan en público (peso aud.) │ │         AUDITORÍA DE MERKLE         │
│   - Suma total de pesos siempre <= Censo       │ │ - Verificación firma ciega y serial │
└────────────────────────────────────────────────┘ │ - Árbol de Merkle SHA-256 binario   │
                                                   │ - Hoja = H(Leaf-v1 || H(salt||voto))│
                                                   │ - Recibo público #Receipt_Hash      │
                                                   │ - Cierre anclado con RFC 3161 TSA   │
                                                   └─────────────────────────────────────┘
```

---

## 2. ESPECIFICACIÓN DETALLADA DEL PROTOCOLO

### A. Pipeline de Elegibilidad (+18) y Cero Fricción (Módulo Censo)

1. **Lectura NFC de DNIe (ICAO 9303 / PACE):**
   - El alta se inicia mediante lectura NFC (`ISO-DEP`) utilizando el código CAN de 6 dígitos impreso en el anverso del documento.
   - El canal seguro PACE deriva claves de sesión efímeras para extraer los Data Groups (`DG1`, `DG2`, `DG15`) y el fichero de seguridad `EF.SOD`.

2. **Validación en RAM del Servidor (Zero-Storage PII):**
   - **Cadena de Confianza CSCA:** El servidor comprueba la firma de la Autoridad de Certificación Raíz de la Policía Nacional sobre el Document Signer (DS) y la firma del DS sobre los hashes SHA-256 de `DG1`, `DG2` y `DG15` contenidos en `EF.SOD`.
   - **Comprobación de Mayoría de Edad y Vigencia:** Del MRZ TD1 (`DG1`) se extraen exclusivamente las fechas de nacimiento y caducidad validadas por los dígitos de control 7-3-1 de la OACI. Se exige:
     $$\text{edad}(\text{birthDate}, \text{now}) \ge 18 \quad \land \quad \text{expiryDate} > \text{now}$$
   - **Autenticación Activa (DG15) con Channel Binding Criptográfico:** El chip físico firma con su clave privada en hardware (cuya clave pública reside en `DG15`) un reto con enlace de canal:
     $$\text{Challenge} = \text{SHA-256}(\text{Server\_Nonce} \parallel \text{Client\_WebAuthn\_PubKey} \parallel \text{Timestamp})$$
     Esto impide cualquier ataque de retransmisión (replay) o intermediario (MITM), ya que el chip liga su presencia física directamente a la passkey generada en el dispositivo móvil del ciudadano.
   - **Cotejo Biométrico Local (`DG2`):** La cámara del dispositivo compara la biometría facial del ciudadano contra la foto certificada del chip (`DG2`) mediante enclave local efímero. El servidor solo recibe la confirmación booleana de coincidencia.

3. **Derivación de Nullifier Antimultidispositivo y Destrucción Inmediata de PII:**
   - En memoria volátil, se calcula el identificador pseudoanónimo del ciudadano:
     $$\text{Nullifier\_ID} = \text{Argon2id}(\text{DNI\_Number}, \text{KMS\_Secret\_Pepper\_256bit}, \text{params})$$
   - **Invariante de Privacidad:** En $< 50\text{ ms}$, los búferes que contienen `DG1`, `DG2`, `DG15`, nombre y número de DNI son sobreescritos con ceros (`.fill(0)`) y liberados para el recolector de basura.
   - **Regla Antimultidispositivo (1 Nullifier = 1 Passkey Activa):**
     * Si un `Nullifier_ID` se registra por primera vez, se asocia a su `Credential_ID` de WebAuthn.
     * Si el mismo `Nullifier_ID` se registra desde un nuevo dispositivo, se revoca atómicamente la passkey previa en el índice del censo y se registra el evento en el log de auditoría. La passkey anterior no podrá firmar tokens ni delegar.

4. **Autenticación Cotidiana (WebAuthn / Passkeys ES256):**
   - El ciudadano no usa contraseñas ni semillas. Cada acción (solicitud de token ciego, delegación o voto público) requiere una firma biométrica en hardware mediante WebAuthn con verificación de usuario (`UV = required`).

---

### B. Protocolo de Voto Secreto, Delegación Líquida y Verificabilidad

1. **Desacoplamiento Censo ↔ Urna mediante Firmas Ciegas (RSA-FDH / Chaum):**
   - Para cada consulta (`consultation_id`), el ciudadano tiene en el Censo exactamente uno de los siguientes estados:
     * `AVAILABLE`: Con derecho a participar.
     * `BLIND_TOKEN_ISSUED`: Ha solicitado un token de voto secreto.
     * `DELEGATED`: Ha delegado en un especialista de la categoría temática.
     * `PUBLIC_VOTED`: Ha emitido un voto público como especialista verificado.
   - **Protocolo de Cegado:**
     1. El cliente genera un número de serie secreto aleatorio de 256 bits (`serial`).
     2. Calcula el hash de dominio completo: $m = \text{FDH}(\text{consultation\_id}, \text{serial})$.
     3. Elige un factor de cegado aleatorio $r \in \mathbb{Z}_n^*$ y computa el mensaje cegado:
        $$m' = m \cdot r^e \pmod n$$
     4. Envía $m'$ al Censo junto con una aserción WebAuthn de su Passkey activa.
     5. El Censo comprueba que el ciudadano está en estado `AVAILABLE` (o `DELEGATED`), marca atómicamente su estado a `BLIND_TOKEN_ISSUED`, y firma el mensaje cegado sin poder ver el número de serie:
        $$s' = (m')^d \pmod n$$
     6. El cliente desenmascara la firma multiplicando por el inverso modular:
        $$s = s' \cdot r^{-1} \pmod n \quad \implies \quad s^e \equiv m \pmod n$$
     7. **Depósito Anónimo:** El cliente envía a la Urna el paquete anónimo $( \text{serial}, s, \text{salt}, \text{choice} )$ a través de una conexión sin registro de IP y con un retardo aleatorio (*jitter*) para romper cualquier correlación temporal con el momento de emisión en el Censo.

2. **Grafo de Democracia Líquida (DAG):**
   - Delegaciones temáticas independientes por categoría (Vivienda, Economía, Sanidad, etc.).
   - **Prevención de Bucles:** Antes de registrar una delegación $A \to B$, se ejecuta un recorrido de Búsqueda en Profundidad (DFS). Si existe un camino $B \to \dots \to A$, la operación se rechaza con código `CYCLE_DETECTED` y el grafo permanece intacto.
   - **Hot-Override (Revocación Instantánea por Voto Directo):** Si un ciudadano que delegó solicita un token ciego o emite un voto directo, la delegación queda revocada automáticamente para esa consulta. Su peso ya no computa en el delegado.
   - **Invariante de Masa Electoral:** La suma de votos secretos, votos públicos ponderados, votos perdidos y votos pendientes es siempre menor o igual al censo total de nullifiers activos:
     $$\text{VotosSecretos} + \sum \text{PesoEspecialistas} + \text{PesoPerdido} + \text{Pendiente} \le \text{Censo}$$

3. **Escrutinio Auditable y Árbol de Merkle SHA-256:**
   - **PROHIBIDO EL USO DE BLOCKCHAIN O WEB3:** Cero criptomonedas, cero gas, cero contratos inteligentes y cero especulación.
   - Cada voto depositado genera una hoja en el árbol de Merkle:
     $$\text{Leaf} = \text{SHA-256}(0\text{x}00 \parallel \text{consultation\_id} \parallel \text{SHA-256}(\text{salt} \parallel \text{choice}))$$
   - El cliente almacena en su dispositivo el recibo cívico `#Receipt_Hash = SHA-256("DV-RECEIPT-v1" || consultation_id || Leaf)`.
   - El árbol de Merkle se construye con ordenación canónica de hojas y separación de prefijos de dominio ($0\text{x}00$ para hojas, $0\text{x}01$ para nodos internos), previniendo vulnerabilidades de colisión por duplicación (CVE-2012-2459).
   - **Sellado de Tiempo Criptográfico (RFC 3161):** Al cerrar la consulta, la raíz del árbol (`Merkle_Root`) se ancla mediante un sello de tiempo cualificado RFC 3161 emitido por una Autoridad de Sellado de Tiempo (TSA), garantizando que las papeletas no pueden ser añadidas ni alteradas retrospectivamente.

---

### C. Modo de Pruebas y Simulador Interactivo (Sandbox & Crypto Simulator)

El entorno incluye un modo de simulación completamente funcional en el navegador:
1. **Emulador de Chip DNIe NFC (Mock ICAO 9303):**
   - 5 escenarios de prueba con verificación real en memoria:
     a) *Ciudadano Adulto Válido (+18):* Genera un paquete auténtico firmado con la autoridad de pruebas `TEST_CSCA`. Supera los 8 pasos de validación.
     b) *Menor de Edad (<18):* MRZ válido con fecha de nacimiento menor a 18 años. Bloqueado al 100% (`UNDER_18`).
     c) *DNI Caducado:* Documento con fecha de caducidad pasada. Bloqueado al 100% (`DOCUMENT_EXPIRED`).
     d) *Cambio de Dispositivo (Mismo DNI):* Simula el mismo chip físico en una segunda sesión. El `Nullifier_ID` es idéntico, revoca la passkey anterior y bloquea el doble voto.
     e) *Ataque de Firma Falsa / Replay:* Inyección de DG1 alterado o firma de AA reutilizada. Bloqueado al 100% (`SOD_HASH_MISMATCH` / `ACTIVE_AUTH_FAILED`).
2. **Emulador WebAuthn / Passkeys:**
   - Alternancia instantánea entre `VirtualPasskey` (firma ES256 en memoria para pruebas automáticas) y `PlatformPasskey` (sensor biométrico real FaceID / TouchID / Windows Hello).
3. **Simulador de Tráfico en Lotes (Batch Vote Simulator):**
   - Simulación de 10, 50 o 200 ciudadanos virtuales concurrentes, con votos directos, cadenas de delegación líquida, anulaciones en caliente y ataques de bucle/doble voto bloqueados en vivo.
   - Crecimiento dinámico del Árbol de Merkle y emisión de recibos `#Receipt_Hash` auditables.
   - Botón **"Reset Sandbox State"** para reiniciar el censo y las urnas de prueba en cualquier momento.
   - Etiquetado explícito de todos los objetos con `ENV: SANDBOX`.

---

### D. Panel de Administración "Zero-Trust Command Center" (`/admin`)

El panel de administración cuenta con 5 consolas especializadas:
1. **Censo & Sybil Defense Monitor:** KPIs de nullifiers activos, passkeys registradas y revocadas, gráfico SVG de intentos de alta rechazados por tipología y registro de seguridad sin PII.
2. **BOE & LLM Ingestion Studio:** Ingesta de textos oficiales del BOE y extracción determinista forzada por JSON Schema (compatible con Ollama Qwen 2.5 local y extractor determinista de reserva). Editor visual con previsualización móvil de tarjeta y monográfico pedagógico.
3. **Urna Criptográfica & Merkle Audit Hub:** Control de ciclo de vida de consultas (Borrador, Activa, Cerrada), barras de escrutinio en tiempo real, visor interactivo del árbol de Merkle, validador de recibos `#Receipt_Hash` y estado del sello RFC 3161.
4. **Liquid Delegation Graph (DAG Explorer):** Visualización interactiva en SVG de los nodos y aristas de delegación por categoría temática, pesos de especialistas y demostrador de bloqueo de ciclos ($A \to B \to C \to A$).
5. **Interactive Sandbox & Stress Lab:** Consola táctica para ejecutar los escenarios de DNIe NFC, lanzar simulaciones de tráfico masivo y ejecutar trazas paso a paso del cegado, firma y depósito.

---

## 3. INVARIANTES DE SEGURIDAD ZERO-TRUST Y REGLAS ANTI-SLOP

1. **Invariantes Criptográficos Estrictos:**
   - **I1:** $1\text{ Ciudadano (+18)} = 1\text{ Nullifier\_ID} = 1\text{ Passkey Activa}$.
   - **I2:** El Censo conoce la identidad pero **NUNCA** ve la papeleta, el número de serie ni el sentido del voto.
   - **I3:** La Urna conoce la validez matemática del voto y su número de serie gastado pero **NUNCA** conoce la identidad, dirección IP o timestamp del votante.
   - **I4:** Ningún rol de administrador puede consultar qué votó un ciudadano ni alterar el conteo de votos (el modelo de lectura de administración `AdminReadModel` no expone ningún método de mutación ni de inspección individual).
   - **I5:** El grafo de delegación temática es siempre un Grafo Acíclico Dirigido (DAG). Cualquier arista que cierre un ciclo es rechazada sin alterar el estado previo.

2. **Reglas de Diseño y Calidad Visual (Anti-Slop):**
   - Prohibido el uso de degradados morados/azules genéricos o sombras difusas sin contraste.
   - Paleta de diseño técnico inspirada en instrumentación suiza y herramientas de ingeniería (Linear / Stripe): grafito cálido (`#0C0D0B`), marfil perla (`#EFEEE6`), ámbar técnico (`#EBA43C`), esmeralda soberano (`#43C08F`) y carmesí institucional (`#EA5A43`).
   - Vista móvil ciudadana confinada estrictamente a **100dvh Zero-Scroll** en viewports de $375\text{px}$, con botones de votación fijos y accesibilidad WCAG 2.1 AA.
   - El Modo Sandbox se identifica mediante un distintivo técnico de advertencia (`SANDBOX SIMULATION ACTIVE`) sin alterar el flujo ergonómico del ciudadano.

---

## 4. LIMITACIONES TÉCNICAS DECLARADAS

1. **Sellado de Tiempo (RFC 3161):** La clase `TimestampAuthoritySim` emula la estructura de un token RFC 3161 firmado con ECDSA P-256. En despliegue de producción se conecta con una Autoridad de Sellado de Tiempo cualificada según el reglamento eIDAS mediante la interfaz `TimestampAuthority`.
2. **Cotejo Facial DG2:** En la prueba web, el cotejo biométrico se atestigua mediante bandera local de dispositivo; en la aplicación nativa final móvil, se ejecuta mediante el motor de reconocimiento biométrico local del enclave seguro (FaceID / Android Biometrics).
3. **Parámetros Argon2id en Sandbox:** Para permitir simulaciones ágiles de cientos de votantes en el hilo principal del navegador sin congelar la UI, el modo Sandbox utiliza parámetros ligeros ($m = 1024\text{ KiB}, t = 1$), mientras que la especificación de producción define los parámetros OWASP ($m = 19456\text{ KiB}, t = 2, p = 1$).
4. **Firma Ciega:** La implementación utiliza el esquema clásico de firma ciega RSA-FDH (Chaum, 1983) con claves RSA-2048. Para el despliegue final en producción a gran escala se contempla la evolución al estándar IETF RFC 9474 (RSABSSA-PSS).
