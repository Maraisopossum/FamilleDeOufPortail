# Qui est-ce de la Tribu — spécification complète

Jeu de déduction à 2 joueurs, en duel à distance (salon avec code), sur le même
modèle technique que la Bataille Navale / Puissance 4 / Jeu des Paires.

## Principe

Chaque joueur reçoit un **personnage mystère** secret, tiré au sort parmi les
24 du plateau. Le but : deviner le personnage mystère de l'adversaire avant
lui, en posant des questions sur ses caractéristiques (lunettes, chapeau,
couleur de cheveux...) et en éliminant les personnages qui ne correspondent
plus sur son propre plateau.

**Différence clé avec une IA qui répondrait à ta place : c'est ton adversaire
qui répond lui-même**, en tapant "Oui" ou "Non" sur son écran — exactement
comme il le ferait à voix haute avec le jeu physique. L'app connaît la vraie
réponse (elle sait quel est son personnage mystère) et vérifie discrètement
s'il a dit la vérité.

## Déroulé d'un tour

1. C'est ton tour : tu choisis un **trait** à demander parmi une liste
   (ex: "Porte des lunettes ?", "A des cheveux roux ?", "Porte un chapeau ?").
2. La question s'affiche sur l'écran de l'adversaire : **"On te demande :
   ton personnage porte-t-il des lunettes ?"**, avec deux gros boutons
   **Oui** / **Non**.
3. L'adversaire tape sa réponse.
4. L'app compare la réponse tapée à la vraie caractéristique de son
   personnage mystère :
   - **Réponse honnête** → la réponse (Oui/Non) s'affiche normalement chez
     toi, tu peux éliminer les personnages qui ne correspondent plus.
   - **Mensonge** → l'écran de l'adversaire affiche immédiatement un grand
     bandeau rouge **"MYTHO ! 🤥"** en plein écran (avec le trait sur lequel
     il/elle a menti en dessous, en plus petit : *"Tu as menti sur : porte
     des lunettes"*), qui reste 2-3 secondes puis disparaît. Le mensonge
     n'est **pas** signalé automatiquement à l'adversaire — la fausse
     réponse lui est transmise telle quelle, comme s'il s'agissait de la
     vérité. C'est un vrai risque : bluffer peut t'aider à brouiller les
     pistes, mais tu risques de te faire prendre en flagrant délit devant
     toute la pièce si vous jouez ensemble sur le même canapé.
   - *(Point ajustable : si tu préfères que l'app avertisse aussi le joueur
     qui a posé la question — via un indice discret genre "Réponse
     douteuse" — dis-le-moi, c'est un simple choix de règle à trancher avant
     de coder.)*
5. À tout moment (pas seulement à son tour), un joueur peut tenter une
   **accusation directe** : "Je pense que ton personnage mystère est Léa."
   - Bonne réponse → victoire immédiate.
   - Mauvaise réponse → le joueur perd son tour suivant (pénalité, pour
     décourager les accusations au hasard, comme dans le jeu original).
6. Premier à deviner correctement le personnage de l'autre gagne. Résultat
   enregistré dans l'historique commun ("Qui est-ce de la Tribu").

## Écrans de l'app

1. **Mode** — Solo (vs IA) / Duel en famille / Historique (mêmes rôles que
   les autres jeux).
2. **Solo vs IA** — l'IA a aussi un personnage mystère ; comme l'app connaît
   déjà ton personnage, elle répond à ta place aux questions de l'IA (pas de
   bouton Oui/Non à taper toi-même contre l'IA — la vérification de mensonge
   ne s'applique qu'en duel humain, l'IA ne triche pas). L'IA choisit son
   prochain trait à demander selon celui qui éliminerait le plus de
   personnages restants (même logique que le niveau "Malin" du Puissance 4).
3. **Duel en famille** — salon avec code, identique aux 3 autres jeux
   (ouvrir un salon / entrer un code / salons en attente / bouton "Vider les
   salons inactifs" / reprise de salon en attente / annulation qui notifie
   l'adversaire).
4. **Plateau** — grille des 24 personnages (les tiens, retournés au fur et à
   mesure de tes déductions), barre de traits à poser en question, zone
   d'affichage de la dernière réponse reçue, bouton "Accuser".
5. **Écran de réponse** (uniquement affiché à l'adversaire quand on lui pose
   une question) — la question posée en gros, deux boutons Oui/Non.
6. **Fin de partie** — victoire/défaite, le personnage mystère de chacun est
   révélé (comme la flotte adverse en Bataille Navale), score enregistré.

## Partie technique (pour référence)

- Table `guesswho_rooms` : `code`, `host_name`, `guest_name`, `host_target`
  (id du personnage), `guest_target`, `host_eliminated` (jsonb, liste des id
  éliminés sur le plateau de l'hôte), `guest_eliminated`, `pending_question`
  (jsonb : `{by, trait}` — la question en attente de réponse), `turn`,
  `status`, `winner`, `created_at`.
- `games/guesswho.js` sur le modèle de `connect4.js` / `paires.js` : mêmes
  garde-fous (annulation qui notifie l'adversaire, reprise de salon, purge
  automatique des salons abandonnés, sondage de secours en plus du temps
  réel).
- Table `characters` (ou simple tableau JS constant, pas besoin de
  base de données pour 24 lignes fixes) avec les traits de chaque
  personnage — utilisée pour vérifier les réponses et faire jouer l'IA.
- Historique partagé, nom `"Qui est-ce de la Tribu"`.

## Roster des 24 personnages

| # | Nom | Genre | Cheveux | Longueur | Lunettes | Chapeau | Barbe/Moustache |
|---|-----|-------|---------|----------|----------|---------|-------------------|
|1|Léo|H|Brun|Court|Non|Non|Barbe|
|2|Nina|F|Blond|Long|Non|Non|—|
|3|Max|H|Noir|Court|Oui|Non|Non|
|4|Zoé|F|Roux|Long|Oui|Non|—|
|5|Tom|H|Chauve|—|Non|Non|Moustache|
|6|Léa|F|Brun|Court|Non|Chapeau|—|
|7|Nathan|H|Blond|Court|Oui|Non|Non|
|8|Chloé|F|Noir|Long|Non|Non|—|
|9|Hugo|H|Gris|Court|Non|Chapeau|Barbe|
|10|Emma|F|Blond|Court|Oui|Non|—|
|11|Lucas|H|Roux|Court|Non|Non|Non|
|12|Inès|F|Brun|Long|Oui|Chapeau|—|
|13|Adam|H|Noir|Long|Oui|Non|Barbe|
|14|Julie|F|Gris|Court|Non|Non|—|
|15|Sacha|H|Chauve|—|Oui|Non|Moustache|
|16|Rose|F|Roux|Court|Non|Chapeau|—|
|17|Noah|H|Brun|Long|Non|Non|Non|
|18|Mia|F|Noir|Long|Oui|Non|—|
|19|Gabriel|H|Blond|Court|Non|Chapeau|Barbe|
|20|Alice|F|Brun|Court|Oui|Non|—|
|21|Ethan|H|Gris|Long|Non|Non|Moustache|
|22|Camille|F|Blond|Long|Non|Chapeau|—|
|23|Théo|H|Roux|Court|Oui|Non|Non|
|24|Sarah|F|Noir|Court|Non|Non|—|

12 hommes / 12 femmes. Traits répartis pour qu'aucune question ne soit trop
faible ni trop forte (le trait "chapeau" ne concerne que 6 personnages,
comme dans le jeu original — c'est volontairement une question rare et donc
précieuse).

## Prompts d'images ChatGPT — un par personnage

Format demandé pour chaque image : **carré 1024×1024**, fond uni lavande
pastel (`#E8DFF5`), cadrage tête et épaules, style illustration vectorielle
cartoon plate, sans texte ni watermark.

Génère les 24 dans **la même conversation ChatGPT**, à la suite, pour
maximiser la cohérence de style d'une image à l'autre. Enregistre chaque
image sous le nom indiqué.

**Fichier : `guesswho-01-leo.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Léo, homme adulte, cheveux bruns courts, barbe courte, pas
> de lunettes, expression souriante.

**Fichier : `guesswho-02-nina.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Nina, femme adulte, cheveux blonds longs et ondulés, pas de
> lunettes, expression joyeuse.

**Fichier : `guesswho-03-max.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Max, homme adulte, cheveux noirs courts, lunettes rondes,
> visage rasé de près.

**Fichier : `guesswho-04-zoe.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Zoé, femme adulte, cheveux roux longs, lunettes carrées,
> sourire chaleureux.

**Fichier : `guesswho-05-tom.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Tom, homme chauve, moustache fine, pas de lunettes,
> expression malicieuse.

**Fichier : `guesswho-06-lea.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Léa, femme adulte, cheveux bruns courts au carré, porte un
> petit béret, pas de lunettes.

**Fichier : `guesswho-07-nathan.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Nathan, jeune homme, cheveux blonds courts, lunettes, visage
> rasé de près.

**Fichier : `guesswho-08-chloe.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Chloé, femme adulte, cheveux noirs longs et lisses, pas de
> lunettes, expression douce.

**Fichier : `guesswho-09-hugo.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Hugo, homme âgé, cheveux gris courts, barbe grise, porte une
> casquette, pas de lunettes.

**Fichier : `guesswho-10-emma.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Emma, jeune femme, cheveux blonds courts, lunettes rondes
> colorées, sourire éclatant.

**Fichier : `guesswho-11-lucas.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Lucas, homme adulte, cheveux roux courts, visage rasé, pas
> de lunettes.

**Fichier : `guesswho-12-ines.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Inès, femme adulte, cheveux bruns longs, lunettes, porte un
> chapeau à large bord.

**Fichier : `guesswho-13-adam.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Adam, homme adulte, cheveux noirs longs attachés, barbe
> fournie, lunettes.

**Fichier : `guesswho-14-julie.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Julie, femme d'âge mûr, cheveux gris courts, pas de
> lunettes, expression sereine.

**Fichier : `guesswho-15-sacha.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Sacha, homme chauve, moustache, lunettes de soleil relevées
> sur le front.

**Fichier : `guesswho-16-rose.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Rose, femme adulte, cheveux roux courts bouclés, porte un
> chapeau de paille, pas de lunettes.

**Fichier : `guesswho-17-noah.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Noah, homme adulte, cheveux bruns longs, visage rasé, pas de
> lunettes.

**Fichier : `guesswho-18-mia.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Mia, femme adulte, cheveux noirs longs, lunettes papillon.

**Fichier : `guesswho-19-gabriel.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Gabriel, homme adulte, cheveux blonds courts, barbe courte,
> porte une casquette, pas de lunettes.

**Fichier : `guesswho-20-alice.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Alice, femme adulte, cheveux bruns courts, lunettes rondes,
> sourire discret.

**Fichier : `guesswho-21-ethan.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Ethan, homme d'âge mûr, cheveux gris longs, moustache, pas
> de lunettes.

**Fichier : `guesswho-22-camille.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Camille, femme adulte, cheveux blonds longs, porte un
> chapeau élégant, pas de lunettes.

**Fichier : `guesswho-23-theo.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Théo, jeune homme, cheveux roux courts, lunettes, visage
> rasé de près.

**Fichier : `guesswho-24-sarah.png`**
> Génère une image carrée de 1024x1024 pixels. Portrait cartoon plat en
> illustration vectorielle, cadrage tête et épaules, fond uni lavande
> pastel (#E8DFF5), style familial et chaleureux pour un jeu de société,
> couleurs vives, traits épais et propres, sans texte ni watermark.
> Personnage : Sarah, femme adulte, cheveux noirs courts, pas de lunettes,
> sourire éclatant.

## Une fois les 24 images générées

Dépose les 24 fichiers dans le dossier du repo (n'importe où, je les
déplacerai) avec les noms indiqués ci-dessus — je m'occupe ensuite
d'implémenter `games/guesswho.js`, la table Supabase, la route et
l'intégration au portail.

## Points encore ouverts (à trancher à ton retour)

1. Mensonge signalé seulement au menteur (recommandé, cf. ci-dessus), ou
   aussi indiqué discrètement à celui qui pose la question ?
2. Pénalité d'accusation ratée : perte du tour suivant (comme proposé), ou
   autre règle (ex: interdiction de raccuser avant N tours) ?
3. Mode solo vs IA : le garder tel que décrit (l'app répond pour toi), ou
   veux-tu aussi pouvoir taper toi-même tes réponses face à l'IA ?
