# ESPECIFICACIÓN TÉCNICA FORMAL: PROTOCOLO DEMOCRACIA VIVA
**Versión:** 1.0.0-PROD  
**Dominio:** `democraciaviva.es`  
**Ámbito de Referencia:** Sistema de Deliberación, Voto Criptográfico Verificable y Democracia Líquida  
**Caso de Uso Base:** Real Decreto-ley 6/2026 en materia de Vivienda y Acceso Digno al Alquiler  

---

## 1. INTRODUCCIÓN Y ARQUITECTURA LÚDICA (AWWWARDS SOTD STANDARD)

Democracia Viva implementa un estándar de diseño galardonado (Awwwards Site of the Day / estética moderna sencilla, amigable y sofisticada):
1. **Tipografía Geométrica Moderna (Estilo Product Sans):** Adopción de la familia tipográfica **Outfit** (titulares, preguntas de tarjetas y sellos reactivos) combinada con **Plus Jakarta Sans** (interfaz y cuerpo) y **JetBrains Mono** (hashes y auditoría criptográfica). Cero serifas, ofreciendo una lectura clara, amigable y abierta.
2. **Fondo Dinámico con Movimiento Orgánico Flotante:** Lienzo principal enriquecido con una malla ambiental de orbes de gradiente suave (`.ambient-mesh-background`) que flotan a 60fps en bucles orgánicos y responden con micro-paralaje al movimiento del cursor, introduciendo vida y dinamismo sutil sin distraer.
3. **Estética Light Editorial First (Por Defecto):** Lienzo principal en tonos marfil perla ultra-limpios (`#F8F9FA` / `#F1F5F9`), superficies en blanco puro con sombras físicas suaves y multicapa, y bordes milimétricos (`1px solid #E2E8F0`).
4. **Dualidad de Tema (Claro / Oscuro):** Interruptor fluido en cabecera con persistencia local (`data-theme="light"` / `data-theme="dark"`), transitando sin parpadeos hacia un modo oscuro de alta precisión (`#090A0F`).
5. **Mazo Semanal Cívico Enriquecido con Micro-Ilustraciones Vectoriales:** Cada una de las 3 tarjetas axiales del Real Decreto-ley 6/2026 incorpora arte vectorial SVG integrado (arquitectura cívica, desbloqueos fiscales, recargos a fondos), eliminando tarjetas de texto plano.
6. **Cinemática Táctil y Botones Magnéticos:** Gestos táctiles de arrastre con física spring (`cubic-bezier(0.22, 1, 0.36, 1)`) y sellos reactivos dinámicos:
   * **Deslizar a la DERECHA (`Swipe Right`):** Voto soberano **A FAVOR** (Esmeralda `#059669`).
   * **Deslizar a la IZQUIERDA (`Swipe Left`):** Voto soberano **EN CONTRA** (Carmesí `#DC2626`).
   * **Deslizar hacia ARRIBA (`Swipe Up`):** **DELEGAR** el artículo en un especialista verificado (Azul/Ámbar institucional `#1D4ED8` / `#D97706`).
7. **Barómetros de Impacto en Vivo (HUD Reactivo):** Tres anillos dinámicos con deltas instantáneos (+Alivio Inquilino, Seguridad Propietario, Consenso Cívico).
8. **El Puente de Consenso ("Efecto ¡Eureka!"):** Tras la tercera decisión, revelación de la convergencia social mayoritaria (84% de consenso), Medalla Soberana 3D con tilt holográfico interactivo y emisión del Acta Cívica Parlamentaria.
9. **Divulgación Progresiva (3 Capas de Profundidad):**
   * *Capa 1 (Acción Inmediata):* Disyuntiva directa con ilustración en <3s de comprensión.
   * *Capa 2 ("El Dilema - Novela Gráfica"):* Modal estilo cómic con avatares enfrentados y puente de mediación.
   * *Capa 3 ("Modo Auditor ZK"):* Texto oficial del BOE, cómputo del Congreso y recibo ZK con hermanos de Merkle.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CAPA DE IDENTIDAD ANÓNIMA (ZK-SNARK)                 │
│  DNIe / EUDI Wallet ──> IdentitySecret ──> IdentityCommitment (Público) │
│                                  │                                     │
│                     Decreto/Artículo Scope Hash                        │
│                                  │                                     │
│                                  ▼                                     │
│                     NullifierHash = H(Secret, Scope)                   │
│                (Garantiza 1 ciudadano = 1 voto por ámbito)              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               CAPA DE FIRMA ERC-4337 (ACCOUNT ABSTRACTION)             │
│        Passkey / WebAuthn ──> Paymaster L2 EVM (Gasless, 0 tx fee)     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│              MOTOR DETERMINISTA DE DEMOCRACIA LÍQUIDA (DAG)            │
│  Resolución temática: Vivienda | Economía | Sanidad                     │
│  Anti-Ciclo: Detección y poda automática de bucles circulares          │
│  Revocación en caliente: Voto Directo > Delegación Activa              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               ÁRBOL DE MERKLE Y ANCLAJE DE INTEGRIDAD                  │
│       Leaf = H(NullifierHash || Choice || Scope || Timestamp)          │
│       Merkle Root en vivo + Recibo Criptográfico con Prueba de Inclusión│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    ACTA CÍVICA Y BARÓMETRO PARLAMENTARIO               │
│        Contraste en vivo: Congreso de los Diputados vs. Ciudadanía     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ESPECIFICACIÓN DEL MOTOR CRIPTOGRÁFICO Y WEB3 INVISIBLE

### 2.1 Identidad Anónima (Semaphore V4 Pattern)
El protocolo simula una prueba ZK-SNARK basada en el circuito canónico Semaphore v4:
* **Generación de Credenciales:**
  $$\text{IdentitySecret} = H(\text{CitizenSeed} \parallel \text{Entropy})$$
  $$\text{IdentityCommitment} = H(\text{IdentitySecret})$$
* **Generación de Nullifier Unívoco por Ámbito:**
  Para cada artículo $A_i$ de un decreto legislativo:
  $$\text{ScopeHash} = H(\text{DecreeID} \parallel A_i)$$
  $$\text{NullifierHash} = H(\text{IdentitySecret} \parallel \text{ScopeHash})$$
* **Invariante Criptográfico Fundamental:**
  * Si un votante emite dos votos para el mismo $A_i$, ambos generan **exactamente el mismo** `NullifierHash`.
  * La base de datos / smart contract rechaza cualquier entrada cuyo `NullifierHash` ya figure en el conjunto de nulos registrados para ese `ScopeHash` (`ERROR_NULLIFIER_ALREADY_SPENT`).
  * Es computacionalmente inviable reconstruir `IdentitySecret` o el DNI a partir de `NullifierHash` y `ScopeHash` (propiedad de preimagen de función hash criptográfica SHA-256 / Poseidon).
  * **Zero Identity Leakage:** El objeto de voto (`BallotProof`) contiene únicamente `{ nullifierHash, scopeHash, choice, zkProof, merkleRoot, timestamp, txHash }`. En ningún momento se serializan ni transmiten nombres, apellidos, DNI ni claves maestras.

### 2.2 Account Abstraction (ERC-4337 Gasless)
* **UserOperation Flow:** El ciudadano firma mediante el enclave seguro de su dispositivo (FaceID / TouchID / Windows Hello) a través de WebAuthn / Passkeys.
* **Paymaster L2 Sponsorship:** Un contrato Paymaster en Arbitrum One / Base cubre el 100% de la tasa de gas (`SponsoredUserOp`).
* **Experiencia de Usuario:** Latencia percibida $< 800\text{ ms}$, sin necesidad de extensiones de billetera (Metamask), ni custodia de palabras semilla (*seed phrases*).

### 2.3 Estructura del Árbol de Merkle y Recibo Verificable
* Las hojas del árbol de Merkle representan los votos válidos aceptados:
  $$\text{Leaf}_k = H(\text{NullifierHash}_k \parallel \text{Choice}_k \parallel \text{ScopeHash} \parallel \text{Timestamp}_k)$$
* **Árbol Binario Criptográfico:** A medida que entran votos, el árbol se actualiza recalculando los hashes intermedios hasta la raíz ($\text{MerkleRoot}$).
* **Recibo Cívico Verificable:** Cada ciudadano recibe un objeto JSON exportable con:
  1. `receiptId`: Identificador único de transacción.
  2. `txHash`: Identificador de transacción L2 simulado.
  3. `nullifierHash`: Código único del voto (no vinculable a su persona).
  4. `merkleRoot`: Raíz de Merkle en el momento de emisión.
  5. `merkleProof`: Camino de hashes hermanos $(\text{sibling}_0, \text{sibling}_1, \dots)$ y direcciones para reconstruir la raíz de forma independiente en local.
  6. `verificationUrl`: Enlace para auditar el recibo contra el estado del árbol.

---

## 3. ESPECIFICACIÓN DEL MOTOR DE DEMOCRACIA LÍQUIDA (GRAFO DAG)

### 3.1 Modelo Matemático de Grafo y Delegación Temática
Sea $G = (V, E, W)$ un grafo dirigido donde:
* $V$ es el conjunto de ciudadanos y delegados reconocidos.
* $E \subseteq V \times V$ es el conjunto de aristas de delegación dirigida $(u, v)$ donde el ciudadano $u$ delega su voto en $v$ para un ámbito temático $T$ (ej: `VIVIENDA_Y_URBANISMO`).
* Cada ciudadano $u$ posee una capacidad de voto base $w_0(u) = 1$.

### 3.2 Detección y Ruptura de Ciclos (Anti-Cycle Engine)
* **Teorema de No-Circularidad:** Antes de admitir una delegación $(u, v)$, se evalúa si existe un camino dirigido de $v$ a $u$ en $G_T$.
* **Algoritmo de Detección:** Búsqueda en Profundidad (DFS) con marcado tricolor (*Blanco, Gris, Negro*). Si se detecta un nodo en estado *Gris* durante el recorrido desde $v$, existe un ciclo.
* **Política de Ruptura Inmediata:** Si $u$ intenta delegar en $v$ y esto cerraría un ciclo ($A \to B \to C \to A$), el sistema **rechaza formalmente la arista**, notifica la causal con código `ERROR_CIRCULAR_DELEGATION` y mantiene la delegación en estado neutro (voto propio no delegado).

### 3.3 Regla de Precedencia y Revocación en Caliente (Hot-Override)
* **Invariante:** El voto directo de un ciudadano prevalece siempre sobre cualquier delegación pasiva.
* **Cálculo Dinámico de Peso Transitivo:**
  Para un artículo específico $A_i$:
  1. Si el ciudadano $u$ emite un voto directo $C(u, A_i) \neq \emptyset$:
     * El voto de $u$ computa como voto directo con peso 1.
     * Si $u$ tenía delegado su voto en $v$, el peso transmitido de $u$ a $v$ para el artículo $A_i$ se reduce a 0.
  2. Si el ciudadano $u$ no ha votado directamente y mantiene una delegación activa hacia $v$:
     * El peso de $u$ se transfiere transitivamente a $v$.
  3. Si un delegado $v$ vota un artículo, su voto se multiplica por:
     $$\text{Weight}(v, A_i) = 1 + \sum_{k \in \text{Delegadores}(v) \setminus \text{VotantesDirectos}(A_i)} \text{WeightTransitivo}(k)$$
  4. Los pesos se calculan estrictamente con aritmética entera (en puntos base / unidades discretas) para prevenir discrepancias de coma flotante IEEE 754.

---

## 4. CASO DE USO PILOTO: REAL DECRETO-LEY 6/2026 DE VIVIENDA

El decreto se somete a escrutinio cívico en 4 artículos fundamentales, con comparativa formal entre el texto oficial del BOE y su traducción al impacto real:

| ID Artículo | Título en Plataforma | Impacto Práctico (Vida Real / Bolsillo) | Postura Oficial Congreso (2026) |
|---|---|---|---|
| `ART-01` | **Topes de alquiler en zonas tensionadas** | Límite legal del incremento del alquiler al IPC (máx. 2.5%) en áreas declaradas de alta demanda. Evita subidas unilaterales del 30%. | Aprobado ajustado (178 Sí / 172 No) |
| `ART-02` | **Incentivos fiscales a propietarios justos** | Bonificación del 70% en IRPF a propietarios que mantengan precios un 10% por debajo del índice de referencia. | Rechazado (165 Sí / 185 No) |
| `ART-03` | **Movilización forzosa de vivienda vacía de grandes tenedores** | Recargo del 150% en IBI a inmuebles desocupados más de 2 años propiedad de bancos o fondos. | Aprobado (176 Sí / 174 No) |
| `ART-04` | **Protección anti-desahucios sin alternativa habitacional** | Suspensión obligatoria de lanzamientos a familias vulnerables hasta que los servicios sociales ofrezcan realojo digno. | Rechazado (169 Sí / 181 No) |

---

## 5. ROLES DE CIUDADANÍA Y DELEGACIÓN PRECONFIGURADOS

1. **Lucía Ramos (24 años) - Inquilina Joven:**
   * Contexto: Contrato de alquiler que vence en 3 meses en Madrid. 60% de su salario destinado al arriendo.
2. **Manuel Osorio (68 años) - Pequeño Propietario Jubilado:**
   * Contexto: Posee un piso en alquiler como complemento de su pensión. Busca seguridad jurídica e incentivos frente a impagos.
3. **Dra. Elena Miró (45 años) - Urbanista & Arquitecta (Delegada Verificada):**
   * Contexto: Catedrática de Urbanismo Sostenible. Publica justificaciones técnicas exhaustivas de cada voto.
4. **Asociación Vecinal "Vivienda Digna" (Colectivo Ciudadano Verificado):**
   * Contexto: Agrupa a 12.000 asociados. Vota en bloque priorizando el parque público de alquiler y la función social de la vivienda.
5. **Carlos Vega (38 años) - Ingeniero de Software:**
   * Contexto: Escéptico con los partidos políticos, ferviente partidario de la verificación matemática de actas.

---

## 6. PROTOCOLO DEL GAUNTLET LOOP (DOBLE ARBITRAJE CIEGO)

El sistema debe superar 3 rondas sucesivas de auditoría cruzada independiente:
* **Árbitro 1 (Red Team QA):** Ejecución automatizada de casos límite (doble voto, bucles cíclicos, revocación en caliente, escalabilidad y cero fugas).
  * *Criterio de salida:* `QA_GAPS == 0`.
* **Árbitro 2 (Jurado Awwwards / UX):** Auditoría sensorial, heurística de usabilidad (<10s para votar), claridad tipográfica y ausencia de patrones genéricos.
  * *Criterio de salida:* Puntuación global $\ge 9.2 / 10$ y resolución exhaustiva de la `biggest_gap`.

---

## 7. SISTEMA DE MONOGRÁFICOS CÍVICOS "SMART BREVITY" Y DIRECCIÓN DE ARTE

### 7.1. Arquitectura de Monográficos Cívicos de Máximo Rigor
Para garantizar un voto consciente, no polarizado, transparente y riguroso sin abrumar cognitivamente al ciudadano, cada tarjeta del mazo incorpora acceso directo a un **Dossier Monográfico de 2 minutos** (`CivicMonograph`):
1. **Contexto Ciudadano Inicial (Lenguaje Cercano):** Explicación cotidiana y empática del dilema real sin tecnicismos ni jerga jurídica densa, conectando las realidades de inquilinos y pequeños propietarios.
2. **Gráfica de Evidencia Empírica (Infografía SVG):** Visualización vectorial interactiva de la brecha histórica de precios del alquiler vs. salarios reales e inflación (2015-2025), o simulaciones de bolsillo netas.
3. **Infografía de 3 Cifras Clave (KPIs):** Indicadores empíricos contrastados con fuentes de máxima autoridad (Banco de España, INE, AIReF, Ministerio de Vivienda).
4. **Radiografía del Problema (3 Pilares):** Desglose conceptual paso a paso explicando cómo funciona el mecanismo y qué problemas pretende resolver.
5. **Casos Comparados Internacionales (Benchmarks):** Lecciones aprendidas reales con efectos positivos vs. efectos colaterales no deseados (Berlín, Viena, París, Vancouver, País Vasco).
6. **Balanza de Argumentos Equitativa (Pro / Con):** Mapeo simétrico de razones a favor (alivio social, contención) y objeciones de peso (contracción de oferta, incentivos de desinversión).
7. **Dictamen de Expertos Independientes:** Síntesis del consenso técnico de organismos reguladores y consultivos (Banco de España, OCDE, CES).
8. **Auditoría de Fuentes Oficiales y Metodología:** Desglose transparente de los informes oficiales públicos certificados (título de publicación, año, tabla/capítulo y código de referencia oficial).
9. **Votación In-Situ:** Posibilidad de emitir el voto verificable (`✓ A Favor`, `✕ En Contra`, `↑ Delegar`) directamente desde el cierre del monográfico sin fricción.

### 7.2. Dirección de Arte & HUD de Videojuego (Awwwards SOTD)
- **Logotipo Oficial Vectorial:** Isotipo minimalista y depurado que fusiona el arco/portal del ágora cívica con el checkmark dinámico del voto (`dv-logo-grad` / `dv-pulse-grad`), tipografía nítida `Democracia Viva` con punto de estado en vivo (`#10B981`) y subtítulo de gobernanza verificable.
- **Menú Superior HUD Integrado:** Eliminación del contenedor blanco divisor tradicional; los controles flotan como cápsulas de cristal desdibujado (`.hud-pill-capsule`) directamente sobre el lienzo escénico, logrando una integración 100% videojuego ("todo en uno").
- **Tipografía Geométrica Amigable:** `Outfit` (titulares y números con geometría pura inspirada en Google Product Sans) y `Plus Jakarta Sans` (cuerpo editorial legible con kerning suizo refinado). Eliminación completa de serifs tradicionales.
- **Fondo Dinámico Orgánico:** 4 orbes difuminados (`filter: blur(85-95px)`) con gradientes pasteles ultra-suaves en modo claro y auroras profundas en modo oscuro, animados a 60fps con micro-paralaje suave reactivo al cursor (`requestAnimationFrame`).

---

## 8. PROTOCOLO DE IDENTIDAD DIGITAL, WEBAUTHN PASSKEYS Y URNA INMUTABLE (FIRESTORE APPEND-ONLY)

### 8.1. Autenticación Biométrica Nativa (W3C WebAuthn Level 3 / FIDO2)
* **Cero Contraseñas / Cero Wallets:** Democracia Viva erradica la fricción de frases semilla (*seed phrases*), extensiones de billetera (Metamask) y contraseñas débiles. El ciudadano se autentica y firma soberanamente mediante el enclave de seguridad hardware de su dispositivo nativo (Windows Hello, Touch ID, Face ID o llave física FIDO2/YubiKey).
* **Flujo Unificado Just-in-Time (JIT Auth):**
  1. El ciudadano explora deliberaciones, dilemas y monográficos con navegación 100% libre sin barreras de entrada ni login previo forzoso.
  2. En el instante exacto en que decide confirmar su voto (mediante swipe o botón arcade), el sistema detecta si el dispositivo posee una credencial cívica activa.
  3. **Si es nuevo votante:** Se despliega el modal interactivo de enrolamiento biométrico, invocando `navigator.credentials.create()`, generando un par de claves asimétricas en hardware (curva elíptica NIST P-256 / COSE ES256), registrando la clave pública en Firestore `users/{credentialId}` y autenticando una sesión anónima en Firebase Auth.
  4. **Si ya existe credencial:** Se solicita una afirmación biométrica instantánea (`navigator.credentials.get()`) sobre el hash de la acción cívica.

### 8.2. Arquitectura de Identidad Desacoplada (Decoupled Identity)
Para preservar de forma inviolable el secreto del voto estipulado en la Constitución Española y en la Carta de Derechos Digitales:
* **Colección `users/{credentialId}` (Censo Cívico Verificado):**
  Almacena exclusivamente el estado de verificación y la clave pública hardware:
  ```json
  {
    "credentialId": "base64url_hardware_id",
    "publicKey": "base64url_public_key",
    "createdAt": 1776412800000,
    "deviceType": "Biométrico Plataforma (FaceID / TouchID / Windows Hello)",
    "dnieVerified": true
  }
  ```
  **REGLA CRÍTICA DE PRIVACIDAD:** Esta colección jamás almacena, referencia ni enlaza qué propuesta ha votado el ciudadano, ni qué sentido de voto eligió.
* **Colección `votes/{nullifierHash}` (Urna Criptográfica de Libre Auditoría):**
  Cada voto es anónimo, autosuficiente e inmutable. El ID del documento es estrictamente el `nullifierHash`:
  ```json
  {
    "nullifierHash": "0x7f4a8b...",
    "proposalId": "RDL-06-2026-VIVIENDA::ART-01",
    "choice": "YES",
    "timestamp": 1776412815000,
    "clientSignature": "0x39a1b...",
    "merkleLeaf": "0x89c7d...",
    "txHash": "0x4fe2a...",
    "receiptId": "REC-7F4A8B",
    "merkleRoot": "0x12b5c..."
  }
  ```
  **AISLAMIENTO TOTAL:** Ningún campo de `votes` contiene `credentialId`, nombres, DNI, dirección IP ni identificación personal.

### 8.3. Función Determinista de Nulificador Criptográfico
Para hacer cumplir la regla democrática de oro (**1 Ciudadano = 1 Voto**) sin comprometer el anonimato:
$$\text{nullifierHash} = \text{SHA256}(\text{credentialId} \parallel \text{proposalId} \parallel \text{secretSalt})$$
* **Determinismo:** El mismo votante intentando votar en el mismo decreto generará siempre el mismo `nullifierHash`.
* **Resistencia a Preimagen:** Dado un `nullifierHash`, es computacionalmente imposible derivar la identidad ni la credencial hardware del votante.
* **Incorrelacionabilidad Cruzada:** Dado que `proposalId` forma parte de la preimagen del hash, los votos de un mismo ciudadano en dos artículos distintos generan nullifiers completamente dispares, imposibilitando trazados de perfilado político.

### 8.4. Blindaje del Servidor de Base de Datos (`firestore.rules`)
La inmutabilidad no depende de la buena fe del frontend ni del cliente; está garantizada en el núcleo del motor Cloud Firestore mediante reglas de seguridad formales:
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{credentialId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['credentialId', 'publicKey', 'createdAt'])
                    && request.resource.data.credentialId == credentialId;
      allow update, delete: if false;
    }
    match /votes/{nullifierHash} {
      allow read: if true;
      allow create: if !exists(/databases/$(database)/documents/votes/$(nullifierHash))
                    && request.resource.data.nullifierHash == nullifierHash
                    && isValidVotePayload();
      allow update, delete: if false; // BLOQUEO TOTAL CONTRA ROLLBACK O ALTERACIÓN
    }
  }
}
```

### 8.5. Estado de Interfaz Post-Voto (UI Sealed Lock & Recibo Verificable)
Cuando el sistema detecta que el `nullifierHash` del usuario ya está registrado en la propuesta activa:
1. La tarjeta transiciona automáticamente al estado **"Voto Sellado e Inmutable"** (`.card-sealed`).
2. Se desactivan los controles de votación (botones arcade con candado y `.is-locked`), y se bloquean los gestos de deslizamiento (*swipe*).
3. Se bloquea cualquier mecanismo de retroceso o deshacer (`undoDecision()` retorna `false` y oculta el atajo `[Z]`), consolidando la irreversibilidad absoluta.
4. Se habilita el botón de descarga del **Recibo Criptográfico Oficial (`.json`)** para verificación ciudadana independiente.

---

*Fin de la Especificación Formal.*


