# 10 propositions de nouveaux mini-jeux

Dix idées de jeux supplémentaires pour "Les Jeux de la Famille", pensées
pour s'intégrer au portail existant : même look (cartes, `--gold`/`--coral`/
`--teal`), même structure de fichier (`games/xxx.js` avec `GAME_NAME` +
`mountXxx(container)`), et pour la plupart le même système de salons
`<jeu>_rooms` déjà utilisé par Bataille Navale / Puissance 4 / Paires /
Qui est-ce (code à 4 lettres, hôte/invité, poll de secours 4s).

Les 8 premiers sont des duels 1 contre 1 (reprennent tel quel le pattern
de salon existant). Les 2 derniers demandent un peu plus de travail
(jusqu'à N joueurs dans un même salon) — signalés en "Complexité : élevée".

---

## 1. Awalé

**Concept.** Jeu de stratégie africain traditionnel, un des plus vieux
jeux de plateau au monde. Un plateau de 12 trous (6 par joueur) contenus
4 graines chacun ; à son tour, on sème les graines d'un trou dans les
suivants et on capture quand on tombe à 2 ou 3 graines dans le camp
adverse.

**Pourquoi la famille va aimer.** Facile à apprendre en 2 minutes, mais
avec de la vraie profondeur stratégique — plaît autant aux enfants qu'aux
adultes. Change du style "grille" des jeux déjà présents.

**Mode solo.** Contre une IA qui maximise ses captures à courte vue
(1-2 coups d'anticipation), sur le modèle de l'IA de Puissance 4.

**Mode duel.** Salon classique, un tour = un coup, plateau synchronisé
entier à chaque coup (petit objet JSON, comme le `board` de Puissance 4).

**Complexité : moyenne.** Logique de semis/capture à écrire (un aprèm),
reste identique au pattern connect4.js pour le reste.

---

## 2. Dames

**Concept.** Le jeu de dames classique sur plateau 8×8, pions qui
avancent en diagonale et sautent pour capturer, promotion en dame en
bout de plateau.

**Pourquoi la famille va aimer.** Jeu de plateau universel, tout le monde
connaît les règles ou les apprend vite ; bonne alternative "plateau" aux
jeux d'alignement déjà présents.

**Mode solo.** IA basique (priorise les captures obligatoires, sinon coup
aléatoire pondéré vers le centre) — peut être affinée plus tard (minimax
profondeur 2-3 si besoin de plus de challenge).

**Mode duel.** Salon classique, plateau 8×8 sérialisé en tableau plat,
tour envoyé en entier à chaque coup.

**Complexité : moyenne/élevée.** Les règles de capture en chaîne
(rafle obligatoire) demandent un peu plus de logique que les autres
jeux de plateau du portail, mais rien d'exotique.

---

## 3. Le Compte est Bon

**Concept.** Le jeu de calcul mental de "Des Chiffres et des Lettres" :
6 nombres tirés au sort (petits et gros), un nombre cible à atteindre en
combinant +, −, ×, ÷. Le premier qui trouve (ou s'en approche le plus)
dans le temps imparti gagne la manche.

**Pourquoi la famille va aimer.** Jeu 100% calcul, aucune barrière de
lecture ni de vocabulaire, marche pour tous les âges à partir du collège ;
change complètement de registre par rapport aux jeux de plateau/déduction
déjà présents.

**Mode solo.** Contre le chrono, score basé sur la rapidité et la
proximité du compte exact ; plusieurs manches, meilleur score cumulé.

**Mode duel.** Même tirage envoyé aux deux joueurs via le salon, chacun
soumet sa solution en privé, révélation simultanée à la fin du temps
imparti (ou dès que les deux ont validé) — pas besoin de tour par tour,
la manche entière tient dans une seule ligne du salon.

**Complexité : moyenne.** Le tirage + la validation d'une expression
arithmétique respectant les nombres disponibles est le seul point
délicat ; le reste (chrono, manches, score) reprend le pattern du Quiz.

---

## 4. Motus (mot mystère à la Wordle)

**Concept.** Un mot secret à deviner en un nombre limité d'essais ;
chaque proposition indique quelles lettres sont bien placées, présentes
ailleurs, ou absentes (comme Wordle / le jeu télé Motus).

**Pourquoi la famille va aimer.** Format déjà culturellement connu et
addictif (beaucoup de familles y jouent déjà sur leur téléphone), bonne
alternative verbale au Quiz.

**Mode solo.** Un mot du jour (même mot pour tout le monde ce jour-là,
tiré d'une liste de mots français filtrée par longueur), ou un mot
aléatoire en mode "partie libre".

**Mode duel.** Chacun devine le même mot secret sur son propre plateau,
en parallèle (pas vraiment besoin de salon temps réel) — ou variante plus
fidèle au jeu de société : un joueur choisit le mot secret pour l'autre
(comme le "Qui est-ce" mais avec un mot), ce qui réutilise directement le
pattern hôte-choisit / invité-devine déjà en place.

**Complexité : faible.** Pas de plateau graphique complexe, juste une
grille de lettres colorées ; le plus gros du travail est de constituer
une liste de mots français par longueur.

---

## 5. Pendu (Hangman) en duel

**Concept.** Le pendu classique, mais joué à deux : un joueur choisit un
mot ou une expression secrète, l'autre propose des lettres une à une
jusqu'à trouver le mot ou épuiser ses essais.

**Pourquoi la famille va aimer.** Ultra simple à comprendre, bon pour les
plus jeunes, et le fait de choisir soi-même le mot pour piéger l'autre est
amusant en famille.

**Mode solo.** Contre l'ordinateur qui pioche un mot dans une liste
thématique (animaux, pays, cuisine...).

**Mode duel.** Reprend quasiment à l'identique le pattern de "Qui est-ce" :
écran de choix pour l'hôte (saisit son mot secret, pas de fuite d'indice
côté invité), puis l'invité propose des lettres à tour de rôle.

**Complexité : faible.** Le plus simple des dix — reprend directement
l'architecture de salon de Qui est-ce, juste avec un mot au lieu d'un
personnage.

---

## 6. Le Duel des Chiffres (Mastermind numérique)

**Concept.** Version chiffrée du jeu Mastermind / "Bulls and Cows" :
chaque joueur choisit un nombre secret à 4 chiffres (tous différents),
l'autre doit le deviner en proposant des nombres et en recevant à chaque
essai le nombre de chiffres "bien placés" et "présents mais mal placés".

**Pourquoi la famille va aimer.** Jeu de déduction pure, complémentaire à
Qui est-ce (déduction par élimination) mais avec un twist numérique ;
courtes parties, se rejoue facilement.

**Mode solo.** Contre l'ordinateur, avec une IA de proposition simple
(élimine les nombres incompatibles avec les indices reçus, comme dans
l'algorithme classique du Mastermind).

**Mode duel.** Copie quasi directe du pattern de Qui est-ce : écran de
choix du nombre secret pour les deux joueurs, tour par tour pour proposer
un essai, feedback affiché à l'auteur de l'essai uniquement.

**Complexité : faible/moyenne.** Toute la mécanique "secret privé + tour
par tour + feedback" est déjà écrite dans guesswho.js, il suffit
d'adapter le domaine (nombre à 4 chiffres au lieu de personnage).

---

## 7. Réaction Éclair (duel de réflexes)

**Concept.** Un signal apparaît après un délai aléatoire ("Attends...
attends... GO !") ; les deux joueurs doivent taper le plus vite possible
dès l'apparition du signal. Celui qui tape avant le signal perd
directement la manche (faux départ). Meilleur des 5 manches.

**Pourquoi la famille va aimer.** Format très court et rigolo, bon pour
détendre l'ambiance entre deux parties plus longues, accessible même aux
plus petits.

**Mode solo.** Contre un chrono personnel (record à battre), ou contre
une IA qui réagit avec un délai fixe légèrement randomisé.

**Mode duel.** Les deux appareils doivent voir le signal "GO" au même
instant : le salon envoie un timestamp de déclenchement légèrement dans
le futur (ex. +1.5s) que chaque appareil attend localement, pour éviter
les écarts dus à la latence réseau ; chaque joueur envoie ensuite son
temps de réaction mesuré localement, le salon compare.

**Complexité : faible.** Pas de plateau du tout, juste un timer et un
bouton — le point technique à soigner est la synchronisation du signal
via un timestamp partagé plutôt qu'un événement temps réel direct.

---

## 8. Anagramme Express

**Concept.** Des lettres mélangées apparaissent, il faut reconstituer le
mot valide le plus long possible (ou le premier mot valide) dans le temps
imparti. Peut aussi proposer des mots de 3 lettres, 4 lettres, etc. bonus
pour la longueur.

**Pourquoi la famille va aimer.** Jeu de vocabulaire rapide, complémentaire
à Motus (chercher au lieu de deviner), fonctionne bien en mode "course"
où tout le monde reçoit les mêmes lettres.

**Mode solo.** Score au meilleur mot trouvé en un temps donné, plusieurs
manches avec des lettres différentes.

**Mode duel.** Les deux joueurs reçoivent les mêmes lettres mélangées via
le salon, soumettent leur meilleur mot avant la fin du chrono commun,
révélation simultanée (même mécanique de "révélation groupée" que
"Le Compte est Bon").

**Complexité : moyenne.** Nécessite un dictionnaire français (liste de
mots valides) pour vérifier les propositions, et un minimum de calcul
"est-ce que ces lettres permettent de former ce mot".

---

## 9. Taquin (puzzle coulissant)

**Concept.** Le classique puzzle 15 (ou 8) cases : une image découpée en
tuiles mélangées avec une case vide, il faut glisser les tuiles pour
reconstituer l'image dans le bon ordre.

**Pourquoi la famille va aimer.** Jeu calme et visuel, bon pour changer de
rythme, peut utiliser les photos de famille ou les logos des autres jeux
comme images à reconstituer — sympathique clin d'œil au reste du portail.

**Mode solo.** Chrono + nombre de coups, meilleur score personnel.

**Mode duel.** Course : les deux joueurs reçoivent la même image mélangée
de la même façon (seed partagée via le salon), premier arrivé gagne — pas
besoin de synchroniser chaque coup, juste l'état "terminé" avec le temps.

**Complexité : moyenne.** La logique de mélange "résolvable" (un taquin
mal mélangé peut être mathématiquement impossible à résoudre, il faut
mélanger par une série de coups valides plutôt qu'au hasard pur) est le
seul piège technique à connaître.

---

## 10. Petit Bac (Baccalauréat / Scattergories)

**Concept.** Une lettre est tirée au sort, chaque joueur doit trouver en
un temps limité un mot commençant par cette lettre dans chaque catégorie
(prénom, animal, pays, métier, fruit/légume...). À la fin, comparaison
des réponses : un mot unique rapporte plus de points qu'un mot que
plusieurs joueurs ont aussi trouvé.

**Pourquoi la famille va aimer.** LE jeu de rassemblement familial par
excellence, marche très bien à 3, 4, 5 joueurs ou plus autour de la
table — complète bien le portail qui n'a pour l'instant que des duels
1 contre 1.

**Mode solo.** Peu pertinent tel quel (le jeu vit de la comparaison entre
joueurs) — pourrait proposer un mode "contre 2-3 IA" qui génèrent des
réponses plausibles, mais l'intérêt principal reste le mode multijoueur.

**Mode duel / famille.** Ici il faut un salon à **plus de 2 joueurs**
(nouveauté par rapport aux salons actuels, tous limités à hôte + 1
invité) : tout le monde rejoint le même salon avec un code, répond en
privé pendant le temps imparti, puis toutes les réponses sont révélées et
comparées automatiquement pour calculer les points.

**Complexité : élevée.** C'est le plus gros chantier de la liste : il
faut faire évoluer le pattern de salon (`host_name`/`guest_name`) vers une
liste de participants de taille variable, ce qui touche aussi l'écran de
lobby et la logique de fin de partie. Bon candidat pour une prochaine
étape une fois qu'on voudra sortir du format duel.

---

## Résumé rapide

| # | Jeu | Format | Complexité | Réutilise surtout |
|---|-----|--------|------------|--------------------|
| 1 | Awalé | Duel | Moyenne | connect4.js (plateau + tour) |
| 2 | Dames | Duel | Moyenne/élevée | connect4.js (plateau + tour) |
| 3 | Le Compte est Bon | Duel | Moyenne | quiz.js (chrono + score) |
| 4 | Motus | Solo / Duel | Faible | guesswho.js (secret + devine) |
| 5 | Pendu | Duel | Faible | guesswho.js (secret + devine) |
| 6 | Duel des Chiffres | Duel | Faible/moyenne | guesswho.js (secret + devine) |
| 7 | Réaction Éclair | Duel | Faible | nouveau (timer partagé) |
| 8 | Anagramme Express | Duel | Moyenne | quiz.js (chrono + score) |
| 9 | Taquin | Solo / Duel | Moyenne | nouveau (mélange + course) |
| 10 | Petit Bac | Multi (3+) | Élevée | nouveau pattern de salon N joueurs |

Dis-moi lesquels te tentent et on lance un `/grill-me` pour cadrer les
règles précises avant de coder, comme pour Puissance 4, Paires et
Qui est-ce.
