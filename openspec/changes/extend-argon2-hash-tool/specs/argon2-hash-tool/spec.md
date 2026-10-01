# Spec Delta: argon2-hash-tool

## Purpose

Laat gebruikers in de browser argon2-wachtwoordhashes maken en controleren in het PHC-formaat dat
Authelia en andere toepassingen accepteren. Het wachtwoord verlaat de browser daarbij nooit.

## ADDED Requirements

### Requirement: Presets voor hashparameters

De hash-kaart SHALL de presets "Authelia (default)", "OWASP minimum" en "Custom" aanbieden. Een
preset kiezen SHALL variant, iterations, memory, parallelism, hash-lengte en salt-lengte zetten
volgens de tabel:

| Preset             | Variant  | Iterations | Memory (KiB) | Parallelism | Hash len | Salt len |
|--------------------|----------|------------|--------------|-------------|----------|----------|
| Authelia (default) | argon2id | 3          | 65536        | 4           | 32       | 16       |
| OWASP minimum      | argon2id | 2          | 19456        | 1           | 32       | 16       |

#### Scenario: Eerste bezoek

- **WHEN** een gebruiker zonder opgeslagen instellingen of query-parameters de tool opent
- **THEN** is de preset "Authelia (default)" geselecteerd en staan de parameters op de Authelia-waarden

#### Scenario: Preset kiezen

- **WHEN** de gebruiker "OWASP minimum" kiest
- **THEN** staan iterations op 2, memory op 19456, parallelism op 1, en de variant op argon2id

#### Scenario: Parameter handmatig wijzigen

- **WHEN** de gebruiker een parameter aanpast zodat die niet meer overeenkomt met de gekozen preset
- **THEN** toont de preset-keuze "Custom"
- **AND** blijven de aangepaste waarden staan

### Requirement: Hash maken

De tool SHALL met de ingestelde variant en parameters een argon2-hash maken. Bij output-type
"encoded" SHALL dat een PHC-string zijn van de vorm
`$<variant>$v=19$m=<memory>,t=<iterations>,p=<parallelism>$<salt>$<hash>`. Zonder opgegeven
hex-salt SHALL er bij elke generatie een nieuwe cryptografisch random salt van de ingestelde lengte
gebruikt worden.

#### Scenario: Authelia-compatibele hash

- **WHEN** de gebruiker met de Authelia-preset het wachtwoord `test` hasht
- **THEN** begint het resultaat met `$argon2id$v=19$m=65536,t=3,p=4$`
- **AND** verifieert `authelia crypto hash validate` die hash als correct voor `test`

#### Scenario: Twee keer genereren

- **WHEN** de gebruiker zonder hex-salt twee keer achter elkaar Generate kiest met hetzelfde wachtwoord
- **THEN** zijn de twee hashes verschillend

#### Scenario: Bezig met hashen

- **WHEN** er een hash berekend wordt
- **THEN** is de Generate-knop uitgeschakeld en is zichtbaar dat de tool bezig is
- **AND** reageert de pagina na afloop weer normaal

#### Scenario: Resultaat kopiëren

- **WHEN** er een resultaat is en de gebruiker de copy-knop kiest
- **THEN** staat de hash op het klembord

### Requirement: Parametervalidatie

De tool SHALL ongeldige parameters weigeren met een melding in plaats van een hash te proberen te
maken. Memory SHALL maximaal 1048576 KiB zijn en minstens 8 × parallelism. Boven 262144 KiB SHALL
de tool waarschuwen dat de browser traag kan worden of de tab kan crashen. De salt-lengte SHALL
tussen 8 en 64 bytes liggen.

#### Scenario: Memory te laag voor parallelism

- **WHEN** memory 16 KiB is en parallelism 4
- **THEN** is Generate niet mogelijk en meldt de tool dat memory minstens 32 KiB moet zijn

#### Scenario: Veel geheugen

- **WHEN** memory boven 262144 KiB ingesteld wordt
- **THEN** toont de tool een waarschuwing
- **AND** blijft Generate mogelijk

#### Scenario: Ongeldige hex-salt

- **WHEN** de hex-salt tekens bevat die geen hex zijn, of een oneven aantal tekens heeft
- **THEN** is Generate niet mogelijk en meldt de tool dat de salt ongeldig is

### Requirement: Hash controleren

Een verify-kaart SHALL een wachtwoord en een argon2 PHC-hash accepteren en tonen of ze bij elkaar
horen. Variant en parameters SHALL uit de hash gelezen worden, zodat de gebruiker ze niet hoeft in
te vullen.

#### Scenario: Juist wachtwoord

- **WHEN** de gebruiker een hash invoert die gemaakt is voor `test`, samen met wachtwoord `test`
- **THEN** toont de kaart "Match"

#### Scenario: Onjuist wachtwoord

- **WHEN** de gebruiker dezelfde hash invoert met wachtwoord `wrong`
- **THEN** toont de kaart "No match"

#### Scenario: Hash uit Authelia

- **WHEN** de gebruiker een hash invoert die door `authelia crypto hash generate argon2` gemaakt is, met het bijbehorende wachtwoord
- **THEN** toont de kaart "Match"

#### Scenario: Andere varianten

- **WHEN** de gebruiker een geldige `$argon2i$`- of `$argon2d$`-hash invoert met het juiste wachtwoord
- **THEN** toont de kaart "Match"

#### Scenario: Ongeldige hash

- **WHEN** de hash geen geldige argon2 PHC-string is (bijvoorbeeld een bcrypt-hash of willekeurige tekst)
- **THEN** toont de kaart een melding dat de hash ongeldig is
- **AND** loopt de pagina niet vast

#### Scenario: Lege invoer

- **WHEN** wachtwoord of hash leeg is
- **THEN** toont de kaart geen resultaat

### Requirement: Alles blijft in de browser

Wachtwoorden en hashes SHALL niet naar een server gestuurd worden. Het wachtwoord SHALL niet in de
URL of in lokale opslag bewaard worden.

#### Scenario: Wachtwoord niet bewaard

- **WHEN** de gebruiker een wachtwoord invult en de pagina herlaadt
- **THEN** is het wachtwoordveld leeg
- **AND** komt het wachtwoord niet voor in de URL of `localStorage`
