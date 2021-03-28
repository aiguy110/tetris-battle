nameTextBox         = document.getElementById('name-txt');
nameSubmitButton    = document.getElementById('submit-name-btn');
battleIdTextBox     = document.getElementById('battle-id-txt');
createNewButton     = document.getElementById('create-new-btn');
joinExistingButton  = document.getElementById('join-existing-btn');

var username = 'Anonymous';

nameSubmitButton.onclick = () => {
    // Set username
    username = nameTextBox.value;
    
    // Disable further name changes
    nameTextBox.setAttribute('disabled', 'disabled');
    nameSubmitButton.style.display = 'none';

    // Enable Battle ID related elements
    battleIdTextBox.removeAttribute('disabled');
    createNewButton.removeAttribute('disabled');
    joinExistingButton.removeAttribute('disabled');
}

createNewButton.onclick = () => {
    // Do some minimal data validation
    let battleId = battleIdTextBox.value;
    if (battleId == '') {
        alert('BattleID must not be blank.');
        return;
    }

    // Post new battleId and username to the server
    let data = {
        username,
        battleId
    }
    fetch('/battle', {
        body: JSON.stringify(data), 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(resp => resp.json())
      .then(data => {
        if('error' in data) {
            alert(data.error);
        }else{
            window.location.href = `/game.html?battleId=${battleId}&name=${username}`;
        }
    });
}

joinExistingButton.onclick = () => {
    // Do some minimal data validation
    let battleId = battleIdTextBox.value;
    if (battleId == '') {
        alert('BattleID must not be blank.');
        return;
    }

    fetch(`/battle?battleId=${battleId}`)
        .then(resp => resp.json())
        .then(data => {
            if ('error' in data) {
                alert(data.error);
            }else{
                // If data isn't an error object, its a list of players.
                // Only games with exactly one player are joinable.
                if (data.length > 1) {
                    alert('A game with that BattleID exists, but it is already full. Please try another BattleID.')
                    return;
                }
                window.location.href =  `/game.html?battleId=${battleId}&name=${username}`;
            }
        });
}