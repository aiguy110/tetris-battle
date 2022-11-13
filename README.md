# Description
A web-based no-signup two-player competative tetris game. You can easily try out the running code by
visiting one of the live sites: 
- `master` branch auto-deploys to [tetris.kleinflask.me](https://teris.kleinflask.me/)
- `staging` branch auto-deploys to [tetris-staging.kleinflask.me](https://teris-staging.kleinflask.me/)

# Game Instructions
The site itself currently includes no instructions, so it's a good thing you found this repo :D.

The object of the game is to survive longer than your opponent. Currently there is not concept of score.
All of the normal rules of tetris apply (i.e. complete a row to make it disapear) but with an additional 
incentive to complete more than on row at a time: For each row past the 1st you complete with a single
block, that many "dead" rows will be sent to the bottom of your opponent's screen. If you already have 
dead rows on your screen, these will be deleted from your screen before any are sent to your opponents 
screen. 

For example, if I have no dead rows on my screen, and I complete 4 rows with a single block, 3
dead rows will be sent to the bottom of my opponents screen. If I have 1 dead row on my screen, and I 
complete 4 rows with a single block, the dead row will be deleted from my screen, and 2 will be sent to
my opponent's screen.

### Desktop Controls
- `W` or `up-arrow`: Drop block
- `A` or `left-arrow`: Move block left
- `S` or `down-arrow`: Move block down faster
- `D` or `right-arrow`: Move block right 
- `Q` or `page-up`: Rotate block counter-clockwise
- `E` or `page-down`: Rotate block clockwise
- `F` or `space-bar`: Swap active block with stored block

### Mobile Controls
- `Swipe up`: Drop block
- `Drag left`: Move block left
- `Drag right`: Move block right 
- `Drag down`: Move block down faster
- `Tap left half of screen`: Rotate block counter-clockwise
- `Tap right half of screen`: Rotate block clockwise
- `Tap top quarter of screen`: Swap active block with stored block

# Known issues (PRs appreciated!)
- The websocket connections that allow you to see the state of your opponents board are unreliable.
- The server currently echos any message it recieves from a player's websocket connection to the other
  player with no validation. This makes it very easy for a player with a little web-dev experience to
  cheat.
- On mobile, the drag gestures used for moving the active block can some times cause the page to slide.