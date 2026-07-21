# Conception — Activité « Quiz » sur un board du whiteboard collaboratif

> Document de conception (étude, aucune modification de code). Sert de plan d'exécution
> à des développeurs Sonnet. Full-stack : Angular 22 (worktree `.wt-pivot-ui-quiz`) +
> Java 25 / Spring Boot 4 / Spring Modulith (worktree `.wt-pivot-core-quiz`).
>
> Convention de référence : **l'activité `vote` (dot-vote, US08.12.2) est le modèle** ;
> le quiz la calque de bout en bout, avec **une divergence structurante** (masquage des
> bonnes réponses avant révélation, cf. §2/§9). Tous les chemins sont **absolus**.

---

## 1. Résumé exécutif

### 1.1 État des lieux

L'entrée `quiz` existe déjà dans le panneau « Activités » mais est **purement présentationnelle** :
- `.wt-pivot-ui-quiz/projects/collaboratif-ui/src/lib/whiteboard/activities-panel/activities-panel.component.ts:21`
  déclare `{ id: 'quiz', glyph: 'Q', kind: 'brand' }` ;
- `.wt-pivot-ui-quiz/projects/collaboratif-ui/src/lib/whiteboard/board-page/board-page.component.ts:385`
  (`onLaunchActivity`) ne traite que `timer` et `dotvote` ; **`quiz` tombe dans le no-op** (fermeture du panneau) ;
- i18n déjà présente : `.wt-pivot-ui-quiz/projects/collaboratif-ui/i18n/fr.json:611` et `en.json:611`
  (`whiteboard.activities.items.quiz.name/desc`).

Côté backend, **rien** n'existe pour le quiz : le sous-module `whiteboard/quiz/` est à créer.

### 1.2 Périmètre recommandé

**MVP recommandé (à implémenter) — « Quiz QCM animé par le facilitateur »** :
1. Le facilitateur (OWNER/EDITOR) compose N questions QCM (texte + 2 à 6 choix, ≥1 correct)
   dans un dialog de config, puis lance le quiz.
2. Le quiz progresse **question par question**, piloté par le facilitateur (`quiz:next` / `quiz:reveal`).
3. Les participants répondent en direct (un vote par question) ; **la bonne réponse n'est jamais
   diffusée au client tant que la question n'est pas révélée**.
4. À la révélation : distribution par choix + bonne(s) réponse(s) + score cumulé diffusés à tous.
5. `quiz:stop` clôt la session → **classement final (leaderboard)**.
6. **Un seul quiz `ACTIVE` par board** (invariant identique au vote).

**Hors MVP (phase 2, schéma pré-provisionné mais non câblé)** : bonus de rapidité (le schéma
stocke `answered_at`, le score le calcule plus tard), timer par question auto-avançant, choix
multi-corrects (radio → cases), média dans les questions, réutilisation/persistance de quiz
templates, export CSV des résultats.

**Recommandation** : livrer le MVP en calquant strictement `vote/` (même topologie de fichiers,
mêmes patterns de sécurité, même contrat WS/REST). La seule vraie nouveauté architecturale est
le **masquage serveur des bonnes réponses** (§2.4, §9). Le front peut être câblé et testé de bout
en bout **avant** que le backend n'atterrisse (posture WIP actuelle du vote), à condition de figer
d'abord le contrat WS/REST (§5).

---

## 2. Fonctionnel

### 2.1 Ce qu'est un quiz sur un board

Une activité de facilitation temps réel attachée à un board : le facilitateur pose des questions
à choix multiple ; les participants présents sur le board répondent depuis leur écran ; les scores
et la répartition des réponses s'affichent en direct. Analogue Klaxoon « Quiz » / Kahoot, mais
intégré au board (pas de room séparée : réutilise le topic STOMP du board).

**Rôles :**
- **Facilitateur** = membre OWNER ou EDITOR du board (garde `canManage`, cf. `VoteActionService.java:356-360`).
  Compose, lance, avance, révèle, clôt.
- **Participant** = tout membre du board (VIEWER inclus). Répond, voit sa progression et, après
  révélation, la distribution + le classement.

### 2.2 User stories

- **US-Q1 (facilitateur, composition & lancement)** : *En tant que facilitateur, je veux composer
  un jeu de questions QCM et lancer le quiz sur le board, afin de tester les connaissances de
  l'équipe en direct.*
- **US-Q2 (participant, réponse live)** : *En tant que participant, je veux voir la question courante
  et sélectionner ma réponse en direct, afin de participer sans quitter le board.*
- **US-Q3 (facilitateur, progression & révélation)** : *En tant que facilitateur, je veux avancer
  question par question et révéler les bonnes réponses, afin de rythmer la séance.*
- **US-Q4 (tous, résultats & classement)** : *En tant que participant, je veux voir la répartition
  des réponses après révélation et le classement final, afin de connaître le résultat.*

### 2.3 Critères d'acceptation (Given/When/Then)

Format backlog (§10) : table `| Critère | 🤖 Dev |`. Happy path + Error + Security + A11y.

**US-Q1 — Composition & lancement**

| Critère | 🤖 Dev |
|---|---|
| Given un board dont je suis OWNER/EDITOR et un jeu de ≥1 question valide (texte non vide, 2–6 choix, ≥1 correct), when j'envoie `quiz:start`, then une `QuizSession` `ACTIVE` est créée et `quiz:session:started` est diffusé à tous les membres | ⬜ |
| Given un quiz déjà `ACTIVE` sur le board, when j'envoie `quiz:start`, then la seconde création est refusée silencieusement (index partiel unique + garde applicative), aucun second `ACTIVE` | ⬜ |
| Error : given un payload invalide (0 question, choix < 2, aucun choix correct, texte vide), when `quiz:start`, then l'action est **droppée silencieusement** (log WARN, aucun frame d'erreur au client) — posture identique au vote | ⬜ |
| Error : given un jeu dépassant 64 KB sérialisés (trop de questions/choix), when `quiz:start`, then le frame est rejeté par la limite STOMP (`CollaboratifWebSocketConfig` message size 64 KB) — le front borne à MAX_QUESTIONS/MAX_CHOICES en amont | ⬜ |
| Security : given un membre VIEWER (non OWNER/EDITOR), when `quiz:start`, then refus silencieux (`canManage` = false) | ⬜ |
| Security : given un non-membre du board (ou cross-tenant), when il tente `quiz:start`, then l'interceptor de canal STOMP rejette avant le service (`MembershipCacheService.isMember` = false) | ⬜ |
| A11y : given le dialog de composition, then il est `role="dialog" aria-modal="true"`, focus-trap, Escape ferme, chaque champ a un label, contraste ≥ WCAG 2.1 AA | ⬜ |

**US-Q2 — Réponse participant**

| Critère | 🤖 Dev |
|---|---|
| Given une question `OPEN`, when un participant envoie `quiz:answer` avec un `choiceId` de la question courante, then sa réponse est persistée (une seule par (question, user)) et le **compteur de répondants** est diffusé (sans la distribution par choix) | ⬜ |
| Given un participant ayant déjà répondu à la question courante, when il renvoie `quiz:answer`, then sa réponse est **remplacée** (upsert) tant que la question n'est pas révélée, pas de doublon | ⬜ |
| Error : given un `choiceId` n'appartenant pas à la question courante, ou une question non `OPEN`/déjà révélée, when `quiz:answer`, then drop silencieux | ⬜ |
| Security : given un participant, when il reçoit `quiz:session:started`/`quiz:updated` avant révélation, then le payload **ne contient jamais** le flag `correct` ni la distribution par choix (masquage serveur) | ⬜ |
| A11y : given la vue participant, then les choix sont un `radiogroup` navigable au clavier, l'état sélectionné est annoncé (`aria-checked`), le changement de question est annoncé en `aria-live="polite"` | ⬜ |

**US-Q3 — Progression & révélation**

| Critère | 🤖 Dev |
|---|---|
| Given un quiz `ACTIVE`, when le facilitateur envoie `quiz:next`, then la question suivante passe `OPEN`, la précédente `CLOSED`, `quiz:updated` diffusé (nouvelle question sans `correct`) | ⬜ |
| Given une question `OPEN`, when le facilitateur envoie `quiz:reveal`, then la distribution par choix + le(s) `correct` + les scores cumulés sont diffusés (`quiz:updated`, état `REVEALED`) | ⬜ |
| Error : given `quiz:next` alors qu'aucune question suivante n'existe, then l'action est ignorée (ou clôt le quiz selon décision D3, cf. §11) | ⬜ |
| Security : given un participant, when il envoie `quiz:next`/`quiz:reveal`, then refus silencieux (`canManage` = false) | ⬜ |

**US-Q4 — Résultats & classement**

| Critère | 🤖 Dev |
|---|---|
| Given un quiz `ACTIVE`, when le facilitateur envoie `quiz:stop`, then la session passe `CLOSED`, `closed_at` renseigné, `quiz:session:closed` diffusé avec le **leaderboard final** | ⬜ |
| Given un board rejoint après clôture, when le front appelle `GET .../quiz/last`, then il récupère la dernière session `CLOSED` avec ses résultats agrégés | ⬜ |
| Given un board rejoint pendant un quiz `ACTIVE`, when le front appelle `GET .../quiz/current`, then il récupère l'état courant **masqué** (question courante sans `correct` si non révélée) | ⬜ |
| Error : given un non-membre appelle `GET .../quiz/current`, then **404** (jamais 403) — anti-IDOR, calqué sur `VoteQueryService.requireBoardAccess` | ⬜ |
| A11y : given le panneau résultats/leaderboard, then barres de distribution avec libellé texte + valeur (pas couleur seule), classement en liste ordonnée sémantique | ⬜ |

### 2.4 Divergence structurante vs vote : masquage des bonnes réponses

Le vote n'a aucune donnée secrète : tout est diffusé tel quel. Le quiz **doit** empêcher qu'un
participant lise la bonne réponse dans le payload WS/REST avant révélation (sinon triche triviale
via les dev tools). Règles :
- Pendant qu'une question est `OPEN` : le broadcast contient le texte + les choix **sans** `correct`,
  et **seulement le nombre de répondants** (pas la répartition par choix, qui laisserait deviner).
- À `quiz:reveal` : le broadcast contient `correct` par choix + la distribution + les scores.
- Le facilitateur connaît les bonnes réponses **parce qu'il les a saisies** (copie client locale) ;
  après un reload, sa vue « animateur » se réhydrate via `GET .../quiz/current` qui, **pour un
  OWNER/EDITOR uniquement**, peut renvoyer les `correct` (décision D4, §11). MVP par défaut : le
  serveur ne renvoie jamais `correct` avant reveal, même à l'animateur (simplicité + sécurité) ;
  l'animateur re-révèle manuellement.

---

## 3. Architecture backend

Nouveau sous-module `.wt-pivot-core-quiz/collaboratif/src/main/java/fr/pivot/collaboratif/whiteboard/quiz/`,
calqué fichier pour fichier sur `whiteboard/vote/`.

### 3.1 Topologie cible (miroir de `vote/`)

```
whiteboard/quiz/
├── QuizSession.java            (@Entity  collaboratif.quiz_session)   ← calque VoteSession.java
├── Question.java               (@Entity  collaboratif.quiz_question)  ← nouveau (pas d'équivalent vote)
├── Choice.java                 (@Entity  collaboratif.quiz_choice)    ← nouveau
├── Answer.java                 (@Entity  collaboratif.quiz_answer)    ← calque Vote.java
├── QuizStatus.java             (enum ACTIVE/CLOSED)                   ← calque VoteStatus.java
├── QuestionState.java          (enum PENDING/OPEN/CLOSED/REVEALED)    ← nouveau
├── QuizSessionRepository.java  ← calque VoteSessionRepository.java
├── QuestionRepository.java     ← nouveau
├── ChoiceRepository.java       ← nouveau
├── AnswerRepository.java       ← calque VoteRepository.java
├── QuizActionService.java      (WS mutations, @Service @Transactional) ← calque VoteActionService.java
├── QuizQueryService.java       (@Service @Transactional(readOnly))     ← calque VoteQueryService.java
├── QuizController.java         (@RestController GET current/last)      ← calque VoteController.java
└── dto/
    ├── ChoiceResponse.java         (record, SANS `correct` par défaut) ← nouveau
    ├── ChoiceRevealResponse.java   (record, AVEC `correct` + count)     ← nouveau
    ├── QuestionResponse.java       (record)                            ← nouveau
    ├── AnswerResponse.java         (record)                            ← calque VoteResponse.java
    ├── LeaderboardEntryResponse.java (record userId, score, rank)       ← nouveau
    └── QuizSessionResponse.java    (record)                            ← calque VoteSessionResponse.java
```

### 3.2 Entités (conventions JPA reprises de vote)

Références : `VoteSession.java:34` (`@Table(name="vote_session", schema="collaboratif")`),
`Vote.java:26`, `VoteStatus.java:12-19`.

**QuizSession** (calque `VoteSession`) — `@Table(name="quiz_session", schema="collaboratif")` :
- `UUID id` `@Id @GeneratedValue(strategy=GenerationType.UUID)` (jamais fourni par le client).
- `UUID boardId` `@Column(name="board_id", nullable=false, updatable=false)` — **isolation board**.
- `Long tenantId` `@Column(name="tenant_id", nullable=false, updatable=false)` — **isolation tenant**.
- `QuizStatus status` `@Enumerated(EnumType.STRING)` défaut `ACTIVE`.
- `Integer currentQuestionIndex` `@Column(name="current_question_index")` — position 0-based de la question `OPEN`/`REVEALED` (null tant que non démarré).
- `QuestionState currentState` `@Enumerated(EnumType.STRING)` `@Column(name="current_state")` — état de la question courante (`OPEN` / `REVEALED`).
- `Instant timerEndsAt` `@Column(name="timer_ends_at")` (nullable — timer par question, hors MVP).
- `Instant createdAt` `@Column(name="created_at")` `@PrePersist`.
- `Instant closedAt` `@Column(name="closed_at")` (nullable).
- Immuables : board/tenant/createdAt. Mutables (setters) : status, currentQuestionIndex, currentState, timerEndsAt, closedAt.

**Question** (nouveau) — `@Table(name="quiz_question", schema="collaboratif")` :
- `UUID id` `@Id @GeneratedValue`.
- `UUID sessionId` `@Column(name="session_id", nullable=false, updatable=false)`.
- `int position` `@Column(nullable=false)` — ordre 0-based.
- `String text` `@Column(nullable=false, length=500)`.
- `Integer timeLimitSeconds` `@Column(name="time_limit_seconds")` (nullable, hors MVP).

**Choice** (nouveau) — `@Table(name="quiz_choice", schema="collaboratif")` :
- `UUID id`, `UUID questionId` (`@Column(name="question_id", nullable=false, updatable=false)`),
  `int position`, `String text` (`length=300`), `boolean correct` (`@Column(nullable=false)`).
- ⚠️ `correct` est le champ sensible : **jamais** exposé dans un DTO non-reveal (§3.5).

**Answer** (calque `Vote`) — `@Table(name="quiz_answer", schema="collaboratif")` :
- `UUID id`, `UUID sessionId`, `UUID questionId`, `UUID choiceId`, `Long userId`, `Instant createdAt`.
- `Instant answeredAt` `@Column(name="answered_at")` — provisionné pour le bonus rapidité (phase 2).
- **Contrainte d'unicité** `(session_id, question_id, user_id)` → upsert (une réponse par question/user),
  **contrairement** au vote qui empile (`Vote` n'a volontairement pas d'unicité).

**QuizStatus** (calque `VoteStatus.java`) : `ACTIVE`, `CLOSED`.
**QuestionState** (nouveau) : `PENDING`, `OPEN`, `CLOSED`, `REVEALED` (porté par la session pour la
question courante ; MVP peut se limiter à `OPEN`/`REVEALED` sur `QuizSession.currentState`).

### 3.3 Repositories (scoping identique à vote)

Références : `VoteSessionRepository.java:66-69` (`findForUpdate` `@Lock(PESSIMISTIC_WRITE)` scopé
`(id, boardId, tenantId)`), `VoteRepository`.

- **QuizSessionRepository** `extends JpaRepository<QuizSession, UUID>` :
  - `Optional<QuizSession> findByBoardIdAndTenantIdAndStatus(UUID boardId, Long tenantId, QuizStatus status)`.
  - `boolean existsByBoardIdAndStatus(UUID boardId, QuizStatus status)` — garde single-active.
  - `Optional<QuizSession> findFirstByBoardIdAndTenantIdAndStatusOrderByCreatedAtDesc(...)` — dernier `CLOSED`.
  - `@Lock(LockModeType.PESSIMISTIC_WRITE) @Query("SELECT s FROM QuizSession s WHERE s.id=:id AND s.boardId=:boardId AND s.tenantId=:tenantId") Optional<QuizSession> findForUpdate(UUID id, UUID boardId, Long tenantId)` — **cœur anti-IDOR + anti-race** (verrou pour `answer`/`next`/`reveal`/`stop`).
- **QuestionRepository** : `List<Question> findAllBySessionIdOrderByPositionAsc(UUID sessionId)`,
  `Optional<Question> findBySessionIdAndPosition(UUID sessionId, int position)`.
- **ChoiceRepository** : `List<Choice> findAllByQuestionIdInOrderByPositionAsc(Collection<UUID> questionIds)`,
  `long countByIdAndQuestionId(UUID id, UUID questionId)` — validation d'appartenance (calque
  `cardRepository.countByIdInAndBoardId` utilisé dans `VoteActionService.handleCast`).
- **AnswerRepository** `extends JpaRepository<Answer, UUID>` :
  - `Optional<Answer> findBySessionIdAndQuestionIdAndUserId(UUID sessionId, UUID questionId, Long userId)` — upsert.
  - `List<Answer> findAllBySessionId(UUID sessionId)` — tally + leaderboard.
  - `long countBySessionIdAndQuestionId(UUID sessionId, UUID questionId)` — nombre de répondants (broadcast masqué).

Scoping : comme le vote, les requêtes Question/Choice/Answer scopent par `sessionId` ; l'isolation
board/tenant est garantie une couche au-dessus car la session n'est obtenue que via un lookup
scopé `(id, boardId, tenantId)`.

### 3.4 Service de mutation — QuizActionService (calque VoteActionService)

`@Service @Transactional` (cf. `VoteActionService.java:64-65`). Deps : `SimpMessagingTemplate`,
`QuizSessionRepository`, `QuestionRepository`, `ChoiceRepository`, `AnswerRepository`,
`BoardMemberRepository`, `tools.jackson.databind.ObjectMapper`.

Point d'entrée unique (calque `VoteActionService.handle`, `:129`) :
```java
public void handle(UUID boardId, CanvasActionMessage message, StompPrincipal principal)
```
Switch sur `message.type()` → handlers privés :

| Handler | Garde | Comportement | Broadcast |
|---|---|---|---|
| `handleStart` | `canManage` (OWNER/EDITOR) | valide le jeu (≥1 question, 2–6 choix, ≥1 correct, textes non vides, bornes MAX) ; refuse si `existsByBoardIdAndStatus(board, ACTIVE)` ; `saveAndFlush` session+questions+choices en **catchant `DataIntegrityViolationException`** (perte de course vs index partiel unique → drop silencieux) ; ouvre la question 0 (`currentQuestionIndex=0`, `currentState=OPEN`) | `quiz:session:started` (masqué) |
| `handleAnswer` | membre (interceptor) | `lockActiveSession` (verrou pessimiste) ; vérifie question `OPEN` == currentQuestionIndex ; vérifie `choiceId` appartient à la question (`countByIdAndQuestionId != 1` → drop) ; **upsert** via `findBySessionIdAndQuestionIdAndUserId` | `quiz:updated` (compteur répondants uniquement) |
| `handleNext` | `canManage` | `findForUpdate` scopé ; passe currentState `CLOSED`, incrémente `currentQuestionIndex`, `OPEN` la suivante (ou clôt si aucune, décision D3) | `quiz:updated` (masqué, nouvelle question) |
| `handleReveal` | `canManage` | `findForUpdate` ; passe `currentState=REVEALED` | `quiz:updated` (**démasqué** : distribution + correct + scores) |
| `handleStop` | `canManage` | `findForUpdate` ; `status=CLOSED`, `closedAt=now` | `quiz:session:closed` (leaderboard final) |

Type inconnu → WARN + drop (`LogSanitizer.forLog(...)`, cf. `LogSanitizer.java`). **Posture d'erreur
identique au vote : tout refus est silencieux (log seul, aucun frame d'erreur au client).** Toutes les
entrées malformées sont coercées à null/empty par des helpers (`parseUuid`, `toLong`, `asMap`…) →
drop silencieux.

**Publication WS** — helper `broadcast(...)` calqué sur `VoteActionService.java:336-345` :
construit un `BroadcastCanvasMessage(wireType, boardId, userId, dataMap)` (réutilise l'enveloppe
canvas) puis `messagingTemplate.convertAndSend("/topic/whiteboard/" + boardId, msg)`.
`BOARD_TOPIC_PREFIX = "/topic/whiteboard/"` (cf. `VoteActionService.java:70`).

**Garde de management** — calque `VoteActionService.java:356-360` :
```java
private boolean canManage(UUID boardId, Long userId) {
    return boardMemberRepository.findByIdBoardIdAndIdUserId(boardId, userId)
            .map(m -> m.getRole() == BoardRole.OWNER || m.getRole() == BoardRole.EDITOR)
            .orElse(false);
}
```

**Concurrence** : `@Transactional` de classe + verrou pessimiste (`findForUpdate` / `lockActiveSession`)
rendent atomiques l'upsert de réponse et les transitions d'état (mêmes garanties que le quota vote).

### 3.5 DTO — masquage par construction

Deux formes de choix, sélectionnées selon l'état :
- `ChoiceResponse(String id, String text, int position)` — **sans `correct`, sans count**. Sérialisé
  tant que la question est `OPEN`.
- `ChoiceRevealResponse(String id, String text, int position, boolean correct, int count)` — utilisé
  **uniquement** à l'état `REVEALED`.

`QuestionResponse(String id, int position, String text, String state, List<? extends Object> choices,
int answeredCount)` où `choices` porte des `ChoiceResponse` (masqué) ou `ChoiceRevealResponse`
(révélé) selon `state`. `QuizSessionResponse(String id, String boardId, String status,
Integer currentQuestionIndex, QuestionResponse currentQuestion, List<LeaderboardEntryResponse>
leaderboard, String createdAt, String closedAt)` — **`tenantId` jamais exposé** (comme
`VoteSessionResponse`, cf. `VoteSessionResponse.java:36-46`). Records de sortie sans annotations de
validation (validation impérative dans le service, comme vote). Fabriques `of(...)` statiques.

> ⚠️ Règle d'or : le champ `Choice.correct` ne doit **jamais** transiter par un DTO tant que l'état
> n'est pas `REVEALED`. Un test unitaire dédié doit asserter l'absence de `correct` dans le JSON
> `OPEN` (cf. §7).

### 3.6 Contrôleur REST — lectures uniquement (calque VoteController)

`@RestController @RequestMapping(CollaboratifApiPaths.BASE + "/whiteboard/boards/{boardId}/quiz")`
(cf. `VoteController.java:29-30`, chemin final `/api/collaboratif/whiteboard/boards/{boardId}/quiz`).
- `@GetMapping("/current")` → `quizQueryService.current(boardId, principal.userId(), principal.tenantId())`.
- `@GetMapping("/last")` → `quizQueryService.last(...)`.
- Auth via `CollaboratifRequestPrincipal` (Bearer → EN08.3), **pas de `@PreAuthorize`**.
- `QuizQueryService` `@Transactional(readOnly=true)` : `requireBoardAccess` renvoie **404
  (`BoardNotFoundException`)** sur board absent OU non-membre — anti-IDOR, calque
  `VoteQueryService.java:97-105`. Corps `null` + HTTP 200 si aucune session.

### 3.7 Câblage de la mutation entrante (⚠️ point de contrat de module)

Il n'y a **qu'un seul** `@MessageMapping` dans tout le module :
`.wt-pivot-core-quiz/collaboratif/src/main/java/fr/pivot/collaboratif/whiteboard/canvas/WhiteboardActionController.java:79`
(`@MessageMapping("/whiteboard/{boardId}/action")`). Il dispatche par préfixe de type :
`message.type().startsWith("vote:")` → `voteActionService.handle(...)` (`:89-90`).

**Le quiz ajoute une branche `message.type().startsWith("quiz:")` → `quizActionService.handle(...)`**
dans ce même contrôleur. C'est **la seule modification hors du package `quiz/`** et elle crée un
couplage entrant `canvas → quiz` (symétrique du couplage `canvas → vote` existant). Voir §9 pour le
risque contrat de module / Gate 4.

### 3.8 Migration Flyway (forward-additive, V9)

Répertoire : `.wt-pivot-core-quiz/collaboratif/src/main/resources/db/migration/collaboratif/`.
Existant : `V1__schema_init.sql` … `V8__frame_table_backfill.sql`. **Plus haute version = V8 →
la migration quiz est `V9__quiz.sql`** (nouveau fichier additif, **surtout PAS** un édit de V1).

> Nuance V1-mutable : le `CLAUDE.md` racine énonce la règle « V1 unique » pré-BETA, MAIS le module
> `collaboratif` l'a déjà surchargée (`V4__vote.sql` en-tête l.3-11 : V2+ appliqués sur la recette
> Cloud SQL depuis 2026-07-14, checksums figés). La pratique établie ici est **additive numérotée**.
> Cf. mémoire projet « Flyway V1-mutable → table manquante recette » : ajouter une table au V1 mutable
> ne l'applique jamais à une base persistante déjà migrée → 500 `relation does not exist`.

DDL (conventions reprises de `V4__vote.sql` l.29-66) :
```sql
CREATE TABLE IF NOT EXISTS collaboratif.quiz_session (
    id                     UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id               UUID        NOT NULL REFERENCES collaboratif.board(id) ON DELETE CASCADE,
    tenant_id              BIGINT      NOT NULL REFERENCES public.tenants(id),
    status                 VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    current_question_index INTEGER,
    current_state          VARCHAR(20),
    timer_ends_at          TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at              TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_quiz_session_board  ON collaboratif.quiz_session(board_id);
CREATE INDEX IF NOT EXISTS idx_quiz_session_tenant ON collaboratif.quiz_session(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_session_active_per_board
    ON collaboratif.quiz_session(board_id) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS collaboratif.quiz_question (
    id                 UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id         UUID        NOT NULL REFERENCES collaboratif.quiz_session(id) ON DELETE CASCADE,
    position           INTEGER     NOT NULL,
    text               VARCHAR(500) NOT NULL,
    time_limit_seconds INTEGER
);
CREATE INDEX IF NOT EXISTS idx_quiz_question_session ON collaboratif.quiz_question(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_question_pos ON collaboratif.quiz_question(session_id, position);

CREATE TABLE IF NOT EXISTS collaboratif.quiz_choice (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID        NOT NULL REFERENCES collaboratif.quiz_question(id) ON DELETE CASCADE,
    position    INTEGER     NOT NULL,
    text        VARCHAR(300) NOT NULL,
    correct     BOOLEAN     NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_quiz_choice_question ON collaboratif.quiz_choice(question_id);

CREATE TABLE IF NOT EXISTS collaboratif.quiz_answer (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id  UUID        NOT NULL REFERENCES collaboratif.quiz_session(id) ON DELETE CASCADE,
    question_id UUID        NOT NULL REFERENCES collaboratif.quiz_question(id) ON DELETE CASCADE,
    choice_id   UUID        NOT NULL REFERENCES collaboratif.quiz_choice(id) ON DELETE CASCADE,
    user_id     BIGINT      NOT NULL REFERENCES public.users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    answered_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_answer_once
    ON collaboratif.quiz_answer(session_id, question_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answer_session ON collaboratif.quiz_answer(session_id);
```
Conventions : `id UUID DEFAULT gen_random_uuid()`, `board_id … ON DELETE CASCADE`, `tenant_id`/`user_id`
`REFERENCES public.*` **sans cascade** (soft-delete), `TIMESTAMPTZ DEFAULT now()`, index partiel unique
pour l'invariant single-active. **Nouveauté** : `uq_quiz_answer_once` (unicité par question/user, pour
l'upsert) — le vote n'en a pas.

---

## 4. Architecture frontend

Worktree `.wt-pivot-ui-quiz/projects/collaboratif-ui/src/lib/`. Standards : standalone, `OnPush`,
`inject()`, Signals, zéro `any`, Transloco, SCSS BEM, WCAG 2.1 AA. Le front est câblé de bout en bout
**avant** le backend (posture WIP actuelle du vote, cf. commentaires `board-transport.ts:18-22` et
`vote-results-panel.component.ts:33-35`).

### 4.1 Composants Angular

| Composant | Dossier (nouveau) | Modèle | Rôle |
|---|---|---|---|
| `QuizConfigDialogComponent` | `whiteboard/quiz-config-dialog/` | `vote-config-dialog/` | Facilitateur : compose N questions/choix, marque les corrects, émet `start` (jeu complet) / `close`. `role="dialog" aria-modal`, Escape ferme (cf. `vote-config-dialog.component.ts:72-76`). Signals pour le formulaire, bornes `MAX_QUESTIONS`/`MAX_CHOICES`. |
| `QuizParticipantOverlayComponent` | `whiteboard/quiz-overlay/` | `vote-end-overlay/` + `timer-overlay/` | Participant : affiche la question `OPEN`, `radiogroup` de choix, émet `answer(choiceId)`. `aria-live` sur changement de question. |
| `QuizResultsPanelComponent` | `whiteboard/quiz-results-panel/` | `vote-results-panel/` | Distribution par choix (après reveal) + leaderboard cumulé/final. `input.required<QuizSession>()`, `isOwner`, outputs `next`/`reveal`/`stop`/`close`. Barres proportionnelles accessibles (calque `vote-results-panel.component.ts:61-99`). |

### 4.2 Modèle & state (calque `board.types.ts` + `board.store.ts`)

**Types** — ajouts à `.wt-pivot-ui-quiz/projects/collaboratif-ui/src/lib/whiteboard/model/board.types.ts`
(à côté de `BoardVote`/`VoteSession`, `:198`/`:207`) :
```ts
export type QuizStatus = 'ACTIVE' | 'CLOSED';
export type QuestionState = 'OPEN' | 'REVEALED';
export interface QuizChoice { id: string; text: string; position: number;
  correct?: boolean; count?: number; }         // correct/count seulement après reveal
export interface QuizQuestion { id: string; position: number; text: string;
  state: QuestionState; choices: QuizChoice[]; answeredCount: number; }
export interface QuizLeaderboardEntry { userId: string; score: number; rank: number; }
export interface QuizSession { id: string; boardId: string; status: QuizStatus;
  currentQuestionIndex: number | null; currentQuestion: QuizQuestion | null;
  leaderboard: QuizLeaderboardEntry[]; createdAt: string; closedAt: string | null; }
```

**Store** — ajouts à `.wt-pivot-ui-quiz/projects/collaboratif-ui/src/lib/core/whiteboard/board.store.ts`
(section « Timer & vote » `:1973-2018`, signaux `:140-217`, handlers inbound `:535-548`, réhydratation
REST `:393-408`) :
- Signaux : `activeQuizSession = signal<QuizSession|null>(null)`, `lastQuizSession = signal<QuizSession|null>(null)`.
- Computed : `myAnswer` (choix courant du user), `hasAnswered`, `answeredCount`, `leaderboard`.
- Actions (émettent via `transport.emit`, calque `startVote` `:1980`) :
  `startQuiz(questions)`, `answerQuiz(choiceId)`, `nextQuestion()`, `revealQuestion()`, `stopQuiz()`.
- Handlers inbound (calque `:540-548`) :
  `this.on<QuizSession>('quiz:session:started', s => this.activeQuizSession.set(s))`,
  `this.on<QuizSession>('quiz:updated', s => this.activeQuizSession.set(s))`,
  `this.on<QuizSession>('quiz:session:closed', s => { this.activeQuizSession.set(null); this.lastQuizSession.set(s); })`.
- Réhydratation : `loadQuiz('current'|'last')` → `GET ${apiUrl}/whiteboard/boards/${boardId}/quiz/${which}`
  (calque `loadVote` `:393-396`), appelée dans `init()` (calque `:285-286`).
- `ensureSelfUserId()` (`:416`) réutilisé pour attribuer les réponses/score du user courant.

### 4.3 Intégration transport WS (aucune modification du transport)

Le transport est **agnostique du type** : il forwarde tout `{type,data}` vers
`/app/whiteboard/{boardId}/action` et démultiplexe les broadcasts de `/topic/whiteboard/{boardId}`
par `type` (cf. `board-transport.ts:37,130,163,212-227`). Les nouveaux types `quiz:*` fonctionnent
**sans toucher `board-transport.ts`** — il suffit d'appeler `transport.emit('quiz:start', …)` et
`this.on('quiz:updated', …)` dans le store.

### 4.4 Câblage dans `board-page` (calque timer/vote)

Fichiers : `board-page/board-page.component.ts` + `.html`.
- `onLaunchActivity` (`:385`) : ajouter `else if (activityId === 'quiz') { this.showQuizConfig.set(true); }`.
- Signaux de visibilité (calque `showVoteConfig`/`showVoteResults` `:121-125`) :
  `showQuizConfig`, `showQuizResults`, `showQuizOverlay`.
- Handlers : `onStartQuiz(questions)` → `store.startQuiz(questions); showQuizConfig.set(false); showQuizResults.set(true)`
  (calque `onStartVote` `:405-409`).
- Template (`board-page.component.html`, calque `:206-267`) : héberger `<wb-quiz-config-dialog>`,
  `<wb-quiz-overlay>` (participant, visible si `activeQuizSession()` et non-owner), `<wb-quiz-results-panel>`
  (dans un `<aside class="wb-page__panel">`). Bouton de toggle résultats calqué sur `:59-62`.
- L'entrée `quiz` du panneau Activités **existe déjà** (`activities-panel.component.ts:21`) — aucun
  changement du panneau.

---

## 5. Contrat WS / API (à figer avant parallélisation)

### 5.1 STOMP — mutations (client → serveur)

Enveloppe `{ type, data }` envoyée sur `/app/whiteboard/{boardId}/action` (via `transport.emit(type, data)`) :

| type | data | garde | effet |
|---|---|---|---|
| `quiz:start` | `{ boardId, questions: [{ text, choices: [{ text, correct }] }] }` | OWNER/EDITOR | crée la session `ACTIVE`, ouvre Q0 |
| `quiz:answer` | `{ sessionId, boardId, questionId, choiceId }` | membre | upsert réponse du user |
| `quiz:next` | `{ sessionId, boardId }` | OWNER/EDITOR | ferme la question courante, ouvre la suivante |
| `quiz:reveal` | `{ sessionId, boardId }` | OWNER/EDITOR | révèle corrects + distribution + scores |
| `quiz:stop` | `{ sessionId, boardId }` | OWNER/EDITOR | clôt la session, leaderboard final |

### 5.2 STOMP — broadcasts (serveur → clients, sur `/topic/whiteboard/{boardId}`)

| type | payload (`QuizSessionResponse`) | masquage |
|---|---|---|
| `quiz:session:started` | session + Q courante | **masqué** (choix sans `correct`, `answeredCount=0`) |
| `quiz:updated` | session + Q courante + (si REVEALED) distribution + leaderboard | masqué si `OPEN`, démasqué si `REVEALED` |
| `quiz:session:closed` | session `CLOSED` + leaderboard final | démasqué |

### 5.3 REST — lectures (Bearer → `CollaboratifRequestPrincipal`)

| verbe | chemin | réponse |
|---|---|---|
| GET | `/api/collaboratif/whiteboard/boards/{boardId}/quiz/current` | `QuizSessionResponse` (masqué selon état) ou `null`/200 |
| GET | `/api/collaboratif/whiteboard/boards/{boardId}/quiz/last` | dernière `CLOSED` ou `null`/200 |

Accès refusé (non-membre / cross-tenant / board absent) → **404** (jamais 403).

---

## 6. i18n (namespaces `whiteboard.quiz.*` + `whiteboard.activities.items.quiz.*`)

Fichiers : `.wt-pivot-ui-quiz/projects/collaboratif-ui/i18n/fr.json` et `en.json`.
L'entrée activités `whiteboard.activities.items.quiz.{name,desc}` existe déjà (`:611`). **À ajouter**,
un bloc `whiteboard.quiz.*` (miroir de `whiteboard.voteResults.*`) :

| Clé | FR (proposé) | EN (proposé) |
|---|---|---|
| `whiteboard.quiz.config.title` | Composer un quiz | Build a quiz |
| `whiteboard.quiz.config.questionLabel` | Question {{n}} | Question {{n}} |
| `whiteboard.quiz.config.addQuestion` | Ajouter une question | Add a question |
| `whiteboard.quiz.config.addChoice` | Ajouter un choix | Add a choice |
| `whiteboard.quiz.config.correctLabel` | Bonne réponse | Correct answer |
| `whiteboard.quiz.config.start` | Lancer le quiz | Start the quiz |
| `whiteboard.quiz.config.errorNoCorrect` | Marquez au moins une bonne réponse | Mark at least one correct answer |
| `whiteboard.quiz.config.errorMinChoices` | Ajoutez au moins deux choix | Add at least two choices |
| `whiteboard.quiz.overlay.questionProgress` | Question {{index}} / {{total}} | Question {{index}} of {{total}} |
| `whiteboard.quiz.overlay.chooseAnswer` | Choisissez votre réponse | Choose your answer |
| `whiteboard.quiz.overlay.answered` | Réponse enregistrée | Answer recorded |
| `whiteboard.quiz.overlay.waiting` | En attente de la prochaine question… | Waiting for the next question… |
| `whiteboard.quiz.results.title` | Résultats du quiz | Quiz results |
| `whiteboard.quiz.results.responders` | {{n}} participant·e·s ont répondu | {{n}} participants answered |
| `whiteboard.quiz.results.reveal` | Révéler la réponse | Reveal the answer |
| `whiteboard.quiz.results.next` | Question suivante | Next question |
| `whiteboard.quiz.results.stop` | Terminer le quiz | End the quiz |
| `whiteboard.quiz.results.leaderboard` | Classement | Leaderboard |
| `whiteboard.quiz.results.rank` | {{rank}}. {{name}} — {{score}} pts | {{rank}}. {{name}} — {{score}} pts |
| `whiteboard.quiz.results.empty` | Aucune réponse pour l'instant | No answers yet |
| `whiteboard.quiz.close` | Fermer le quiz | Close quiz |

(Les deux fichiers `fr.json`/`en.json` sont éditables ; garder les clés strictement parallèles pour
éviter les MISSING transloco.)

---

## 7. Tests

### 7.1 Frontend (Vitest — cible ≥85%)

- `quiz-config-dialog.component.spec.ts` (calque `vote-config-dialog.component.spec.ts`) : ajout/suppression
  de questions/choix, validation (min 2 choix, ≥1 correct, texte non vide), émission `start` avec le jeu
  complet, Escape → `close`, a11y (rôles, focus-trap).
- `quiz-overlay.component.spec.ts` : rendu question `OPEN`, sélection d'un choix → `answer(choiceId)`,
  état « répondu », **absence de `correct` dans les inputs tant que non `REVEALED`**.
- `quiz-results-panel.component.spec.ts` (calque `vote-results-panel`) : distribution proportionnelle,
  leaderboard trié, gardes owner sur `next`/`reveal`/`stop`, cas vide.
- `board.store.spec.ts` (étendre) : `startQuiz/answerQuiz/nextQuestion/revealQuestion/stopQuiz` émettent
  les bons types ; handlers `quiz:session:started/updated/session:closed` mettent à jour les signaux ;
  `loadQuiz` réhydrate ; **le store n'expose jamais `correct` avant reveal**.
- `board-page.component.spec.ts` (étendre) : `onLaunchActivity('quiz')` ouvre le config dialog ;
  `onStartQuiz` câble le store + ouvre les résultats.

### 7.2 Frontend E2E (Playwright)

Stubs **origin-agnostiques** `**/api/collaboratif/whiteboard/boards/*/quiz/*` (cf. mémoire
« Collaboratif E2E : API relative » — globs `**/api/collaboratif/...`, jamais `localhost:8083`).
Scénarios : facilitateur compose+lance ; participant répond ; reveal affiche la distribution ;
stop affiche le leaderboard ; un participant ne voit pas la bonne réponse avant reveal (assertion DOM/réseau).

### 7.3 Backend (JUnit — cible ≥85%, Gate 2)

- `QuizActionServiceTest` (calque `VoteActionServiceTest`) : start (happy + refus VIEWER + double-active
  droppé + payload invalide droppé) ; answer (upsert, choix hors question droppé, question non-OPEN droppée) ;
  next/reveal/stop (gardes canManage) ; **assertion « le broadcast `OPEN` ne contient jamais `correct` »**.
- `QuizControllerTest` / `QuizQueryServiceTest` : current/last, **404 non-membre**, tenant scoping.
- `QuizSessionRepositoryTest` : `findForUpdate` scopé (id, boardId, tenantId), index partiel unique.
- Migration : test d'intégration Flyway (le contexte se lève, `V9__quiz.sql` s'applique).
- Modularité : le test `ApplicationModules.verify()` existant doit rester vert avec le couplage
  `canvas → quiz` (cf. §9).

> ⚠️ **Gap JDK** : le backend requiert JDK 24/25, indisponible en local (max JDK 19). Les tests Java
> ne se compilent/exécutent **pas** en local → vérification **via CI** sur une **draft PR** (cf. mémoire
> « JDK 24 local gap »). Le front se teste localement.

---

## 8. Plan d'exécution par lots (agents Sonnet parallèles, périmètres disjoints)

Exécution recommandée : **agents Sonnet parallèles en worktree, périmètres disjoints** (cf. mémoire
« Wave execution: parallel Sonnet »). Chemins absolus obligatoires pour les agents en worktree
(cf. mémoire « Subagents + worktree need absolute paths »).

**Prérequis (Lot 0, non parallélisable) : figer le contrat §5.** Ce document EST le contrat. Une fois
validé, front et back avancent en parallèle car le front est câblé contre le contrat sans backend
(posture WIP vote actuelle).

### Vague A — fondations (bloquantes, à faire en premier)

| Lot | Worktree | Fichiers | Périmètre | Done |
|---|---|---|---|---|
| **A1 — Schéma & entités backend** | pivot-core | `db/migration/collaboratif/V9__quiz.sql` ; `whiteboard/quiz/{QuizSession,Question,Choice,Answer,QuizStatus,QuestionState}.java` | Migration V9 + 4 entités + 2 enums (§3.2, §3.8) | Compile en CI (draft PR verte) ; DDL appliquée par Flyway au démarrage |
| **A2 — Types & store frontend** | pivot-ui | `whiteboard/model/board.types.ts` ; `core/whiteboard/board.store.ts` ; `core/whiteboard/board.store.spec.ts` | Types `Quiz*` + surface store (signaux, actions emit, handlers inbound, `loadQuiz`) (§4.2) | `npm test` store vert local ; zéro `any` ; lint OK |

A1 et A2 sont **disjoints** (repos différents) → parallèles.

### Vague B — cœur métier (dépend de A)

| Lot | Worktree | Dépend | Fichiers | Périmètre | Done |
|---|---|---|---|---|---|
| **B1 — Repos + DTO backend** | pivot-core | A1 | `whiteboard/quiz/{QuizSession,Question,Choice,Answer}Repository.java` ; `whiteboard/quiz/dto/*.java` | 4 repos (scoping + findForUpdate) + 6 records DTO avec masquage (§3.3, §3.5) | Compile CI |
| **B2 — QuizConfigDialog (front)** | pivot-ui | A2 (types) | `whiteboard/quiz-config-dialog/*` (+ spec) | Composant composition (§4.1) | `npm test` vert local ; a11y OK |
| **B3 — QuizOverlay + ResultsPanel (front)** | pivot-ui | A2 (types) | `whiteboard/quiz-overlay/*` ; `whiteboard/quiz-results-panel/*` (+ specs) | Vues participant + résultats/leaderboard (§4.1) | `npm test` vert local ; a11y OK |

B1, B2, B3 **disjoints** (repos/dossiers différents) → parallèles.

### Vague C — services & câblage (dépend de B)

| Lot | Worktree | Dépend | Fichiers | Périmètre | Done |
|---|---|---|---|---|---|
| **C1 — QuizActionService + branche WS** | pivot-core | B1 | `whiteboard/quiz/QuizActionService.java` ; **édit** `whiteboard/canvas/WhiteboardActionController.java` (branche `quiz:`) | Mutations WS + broadcast masqué (§3.4, §3.7) | Compile CI ; `ApplicationModules.verify()` vert |
| **C2 — QuizQueryService + QuizController** | pivot-core | B1 | `whiteboard/quiz/{QuizQueryService,QuizController}.java` | Lectures REST + 404 anti-IDOR (§3.6) | Compile CI |
| **C3 — Câblage board-page + i18n** | pivot-ui | B2, B3 | **édit** `board-page/board-page.component.{ts,html}` (+ spec) ; **édit** `i18n/{fr,en}.json` | `onLaunchActivity('quiz')`, hébergement composants, clés i18n (§4.4, §6) | `npm test` vert local ; pas de MISSING transloco |

C1 et C2 touchent le même repo mais **des fichiers disjoints** (sauf `WhiteboardActionController` que
seul C1 édite) → parallélisables avec vigilance. C3 est front, parallèle aux deux.

### Vague D — tests & durcissement (dépend de C)

| Lot | Worktree | Fichiers | Périmètre | Done |
|---|---|---|---|---|
| **D1 — Tests backend** | pivot-core | `QuizActionServiceTest`, `QuizControllerTest`, `QuizQueryServiceTest`, `QuizSessionRepositoryTest` | Couverture ≥85% + assertion masquage `correct` (§7.3) | Gate 2 CI ≥85% |
| **D2 — Tests E2E front** | pivot-ui | specs Playwright `quiz.*` | Scénarios §7.2, stubs API relative | Playwright vert |

### Ordonnancement & gap JDK

```
Lot 0 (contrat figé)
   │
   ├── A1 (back schéma)  ─┐            [pivot-core, CI]
   └── A2 (front store)  ─┤            [pivot-ui, local]
                          ▼
   ┌── B1 (back repos+dto) ──┐
   ├── B2 (front config)   ──┤        parallèles
   └── B3 (front vues)     ──┘
                          ▼
   ┌── C1 (back action+WS) ──┐
   ├── C2 (back query+REST)──┤        parallèles (C1 seul édite WhiteboardActionController)
   └── C3 (front câblage)  ──┘
                          ▼
   ┌── D1 (tests back / CI) ──┐
   └── D2 (E2E front)       ──┘
```

Tous les lots **back** (A1, B1, C1, C2, D1) ne compilent/testent qu'en **CI** (draft PR) — gap JDK.
Tous les lots **front** (A2, B2, B3, C3, D2) se vérifient **en local**. Un lot back peut atterrir sur
`main` avant que le front ne consomme réellement les endpoints (posture WIP vote) : le front est
fonctionnel dès A2+B2+B3+C3, le back « allume » les broadcasts dès C1/C2.

---

## 9. Risques & points d'attention

1. **Contrat de module / Gate 4 (hard block)** — la seule modification hors package `quiz/` est la
   branche `quiz:` dans `whiteboard/canvas/WhiteboardActionController.java:89`. Elle ajoute un couplage
   `canvas → quiz` symétrique du couplage `canvas → vote` déjà accepté. `collaboratif` n'a **ni
   `package-info.java` ni `@ApplicationModule`/`@NamedInterface`** : la modularité est vérifiée
   par `ApplicationModules.verify()` au niveau agrégateur. Le lot C1 doit garder ce test vert ; tout
   changement de contrat non maîtrisé est un **hard block Gate 4**. Ne pas introduire de dépendance
   inverse `quiz → canvas` au-delà de ce que fait déjà `vote` (`CardRepository` etc.).
2. **Masquage des bonnes réponses (sécurité applicative)** — divergence n°1 vs vote. Le `correct` ne
   doit **jamais** transiter avant `REVEALED`, ni en broadcast ni en REST. Garanti *par construction*
   via deux DTO (`ChoiceResponse` vs `ChoiceRevealResponse`) + un test d'assertion. Pendant `OPEN`,
   ne diffuser que le **nombre de répondants**, pas la distribution par choix (fuite indirecte).
3. **Flyway V1-mutable** — utiliser `V9__quiz.sql` **additif**, jamais un édit de `V1__schema_init.sql`
   (base recette persistante déjà migrée → `relation does not exist`). Cf. mémoire projet dédiée.
4. **Gap JDK local (24/25 vs 19)** — aucun lot backend ne se compile/teste en local. Séquencer via
   **draft PR CI** ; ne pas bloquer le front sur le back (front câblé contre le contrat).
5. **Temps réel & concurrence** — réponses concurrentes → `findForUpdate` (verrou pessimiste) +
   unicité `(session, question, user)` pour un upsert atomique. Reconnexion : le front réhydrate via
   `GET .../quiz/current` (état masqué). Course au `quiz:start` → `catch DataIntegrityViolationException`
   sur l'index partiel unique (drop silencieux), comme le vote.
6. **Isolation tenant / IDOR** — persistance et scoping lisent tenant/user **du `StompPrincipal` /
   `CollaboratifRequestPrincipal`, jamais du payload**. Lectures REST → 404 (jamais 403) sur non-membre.
   `tenantId` jamais exposé dans un DTO. Membership STOMP déjà garanti par le channel interceptor.
7. **Pas de logique tenant côté front** — le front n'énumère jamais les membres ni ne calcule de droits
   tenant ; il envoie `choiceId`/`questionId` et affiche ce que le serveur diffuse (le serveur décide du
   masquage). `isOwner` côté front est du confort UI, la garde réelle est serveur (`canManage`).
8. **Limite de taille STOMP (64 KB)** — `quiz:start` porte tout le jeu ; borner côté front
   (`MAX_QUESTIONS`, `MAX_CHOICES`, longueurs de texte) pour rester sous 64 KB
   (`CollaboratifWebSocketConfig` message size limit). En cas de dépassement, le frame est rejeté.
9. **Réhydratation animateur après reload** — décision D4 (§11) : par défaut le serveur ne renvoie pas
   `correct` avant reveal, même à l'animateur ; sa vue de composition est perdue au reload (il doit
   révéler manuellement). Alternative (hors MVP) : renvoyer `correct` en REST **si OWNER/EDITOR**.

---

## 10. Traçabilité backlog

Conventions (cf. `.../pivot-docs/docs/backlog/README.md`) : hiérarchie `EPIC → FEATURE/ENABLER → US` ;
IDs `E01` / `F01.1` / `EN01.1` / `US01.1.1` ; frontmatter en **pied de fichier** ; `Stage: ⬜/✅`
(✅ posé par le mainteneur seul) ; template US avec table d'AC `| Critère | 🤖 Dev |` (Given/When/Then +
Error + Security + A11y) ; **Gate 1 readiness = 100** avant implémentation ; **phase lock** : seuls les
items `Phase: Socle` sont implémentables, les `phase-3` restent `⬜` non travaillés.

### 10.1 Items existants (aucun n'est « live », tous `⬜` / phase-3)

- **US30.3.6 — « Quiz et sondages natifs »** (E30 Collaboration / F30.3 Facilitation d'ateliers) :
  `.../pivot-docs/docs/backlog/EPIC-collaboration/FEATURES/facilitation-ateliers/us-quiz-et-sondages-natifs.md`.
  **Item le plus proche** (quiz auto-corrigé sur le canevas de collaboration), mais **bundle quiz+sondages**,
  ACs benchmark à raffiner, phase-3 verrouillé.
- **US19.3.1 — « Activité QUIZ » (session live)** : `.../EPIC-module-session/FEATURES/activites/us-quiz.md`.
  Quiz multijoueur **dans une Session animée** (room `/topic/collaboratif/quiz/{sessionId}`), **pas** un
  board whiteboard. Scope différent.
- **US47.3.1 — « Trivia Agile »** (E47 Mini-jeux) : icebreaker ludique, hors board.

### 10.2 Recommandation

Créer/raffiner sous **E30 / F30.3** (là où vivent US30.3.1 vote, US30.3.6 quiz, US30.3.9 question
instantanée). Deux options à arbitrer (D1, §11) :
- **Option A (recommandée)** : **scinder US30.3.6** en « quiz » vs « sondages », et faire du volet quiz
  l'US d'implémentation MVP, raffinée avec les ACs §2.3.
- **Option B** : créer une nouvelle US **US30.3.11** (prochain ID libre sous F30.3, la plus haute étant
  US30.3.10), fichier
  `.../EPIC-collaboration/FEATURES/facilitation-ateliers/us-quiz-board-activite.md`,
  frontmatter `Parent: F30.3 · Module: collaboratif · Phase: ? · Size: L · Priority: High`.
  Risque : recouvrement fort avec US30.3.6 (à signaler au PO Agent).

Un **enabler** technique (nouveau sous-module + migration V9 + contrat WS) peut être tracé séparément,
p. ex. **EN30.x** sous E30, si l'on veut isoler la dette technique de la valeur utilisateur.

> ⚠️ **Phase lock** : US30.3.6 et voisines sont `Phase: phase-3` (non implémentables tant que le
> mainteneur n'a pas déclaré « Socle terminé »). Passer l'US retenue en `Phase: Socle` (ou créer une
> US Socle dédiée) est un **arbitrage mainteneur** (D2, §11) — sans quoi les lots §8 ne sont pas
> éligibles à l'implémentation.

---

## 11. Décisions ouvertes (arbitrage humain requis)

- **D1 — Traçabilité** : scinder US30.3.6 (Option A) *ou* créer US30.3.11 (Option B) ? Recommandation : A.
- **D2 — Phase lock** : passer l'US retenue en `Phase: Socle` pour la rendre implémentable (les items
  quiz existants sont phase-3 verrouillés). Décision mainteneur.
- **D3 — Fin de quiz** : `quiz:next` sur la dernière question → ignorer (l'animateur clôt via `quiz:stop`)
  *ou* clôturer automatiquement ? Recommandation : ignorer (clôture explicite).
- **D4 — Vue animateur après reload** : le serveur renvoie-t-il `correct` en REST aux OWNER/EDITOR avant
  reveal ? MVP par défaut : **non** (simplicité + sécurité). À confirmer.
- **D5 — Multi-corrects & bonus rapidité** : hors MVP. Le schéma les autorise (`Choice.correct` multiple,
  `Answer.answered_at`). Confirmer qu'ils restent phase 2.
- **D6 — Portée du timer par question** : le schéma prévoit `time_limit_seconds` / `timer_ends_at` mais le
  MVP est piloté manuellement par le facilitateur (pas d'auto-avance). Confirmer.

---

*Fin du document.*
