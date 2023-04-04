const promptImpersonate = 'You are an AI assistant that helps people find information.';
const aiProfile = document.querySelector('#ai-profile');
const messagesContainer = document.querySelector('#messages');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message-input');
const tokensSpan = document.querySelector('#tokens');

// 获取模态对话框元素和触发器元素
const modal = document.querySelector('.modal');
const usernameLabel = document.querySelector('#username-label');
const userForm = document.querySelector('#user-form');
const usernameInput = document.querySelector('#username-input');

// get tts container element
const ttsContainer = document.querySelector('#tts-container');
ttsContainer.style.display = 'none';

const practiceMode = document.querySelector('#practice-mode');
var ttsPracticeMode = false;
// add click event listener to practiceMode
practiceMode.addEventListener('click', () => {
    const practiceModeIcon = document.querySelector('#practice-mode-icon');
    // if ttsPracticeMode is false, then set it to true
    if (!ttsPracticeMode) {
        ttsPracticeMode = true;
        practiceMode.innerText = 'Practice Mode: On';
        practiceModeIcon.classList.remove('fa-volume-off');
        practiceModeIcon.classList.add('fa-volume-up');
    } else {
        ttsPracticeMode = false;
        practiceMode.innerText = 'Practice Mode: Off';
        practiceModeIcon.classList.remove('fa-volume-up');
        practiceModeIcon.classList.add('fa-volume-off');
    }
});


const max_tokens = 4000;
var currentProfile = null;

// first load prompt repo from /api/prompt_repo it looks like this:
// [  
//     {  
//       "name": "AI",  
//       "icon": "fa-robot",  
//       "displayName": "AI",  
//       "prompt": "You are an AI assistant that helps people find information."  
//     }
//...]
// get the profile data
// then generate menu items from it to menu_list
// and add click event listener 
// to each menu item
// when click, get the profile data
const menuList = document.querySelector('#menu-list');
fetch('/api/prompt_repo')
    .then(response => response.json())
    .then(data => {
        renderMenuList(data);
    });


// Add message to DOM
const addMessage = (sender, message) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(`${sender}-message`);
    //if send is user
    if (sender === 'user') {
        const pre = document.createElement('pre');
        pre.innerText = message;
        messageElement.appendChild(pre);
    } else {
        messageElement.innerHTML = marked.parse(message);
    }

    //check if current profile.tts is exist and value with "enabled"
    if (currentProfile && currentProfile.tts === 'enabled') {
        //create speaker icon
        const speakerElement = document.createElement('i');
        speakerElement.classList.add('message-speaker');
        speakerElement.classList.add('fas');
        speakerElement.classList.add('fa-volume-off');
        //add message to speakerElement dataset
        speakerElement.dataset.message = message;
        messageElement.appendChild(speakerElement);
    } else {
        // if ttsContainer is display, then hide it
        if (ttsContainer.style.display === 'inline-block') {
            ttsContainer.style.display = 'none';
        }
    }
    messagesContainer.appendChild(messageElement);
    attachMessageSpeakerEvent();

    //if ttsPracticeMode and sender is bot,select last message-speaker and click it
    if (ttsPracticeMode && sender === 'bot') {
        const messageSpeaker = document.querySelectorAll('.message-speaker');
        const lastSpeaker = messageSpeaker[messageSpeaker.length - 1];
        if (lastSpeaker) {
            lastSpeaker.click();
        }
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

};


let tokens = 0
let prompts = [{ role: 'system', content: promptImpersonate }];
addMessage('system', promptImpersonate);


// Clear message input
const clearMessage = () => {
    messagesContainer.innerHTML = '';
    messageInput.value = '';
    prompts.splice(0, prompts.length, { role: 'system', content: promptImpersonate });
};


// Send message on button click
const sendMessage = async (message = '') => {
    if (message === '/clear') {
        clearMessage();
        return;
    }
    // if message look like: /system: xxx, then send xxx as system message
    if (message.startsWith('/system')) {
        message = message.replace('/system', '');
        addMessage('system', message);
        prompts.splice(0, prompts.length);
        prompts.push({ role: 'system', content: message });
        return;
    }
    addMessage('user', message);
    prompts.push({ role: 'user', content: message });
    const promptText = JSON.stringify(prompts);
    console.log(promptText);
    messageInput.value = '';
    try {
        const response = await fetch('/api/gpt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText }),
        });
        if (!response.ok) {
            throw new Error('Error generating response.');
        }
        const data = await response.json();
        console.log(data);
        // If no response, pop last prompt and send a message
        if (!data) {
            prompts.pop();
            message = 'AI没有返回结果，请再说一下你的问题，或者换个问题问我吧。';
        } else {
            prompts.push({ role: 'assistant', content: data.message });
            tokens = data.totalTokens;
            tokensSpan.textContent = `${tokens} tokens`;
            // If tokens are over 80% of max_tokens, remove the first round conversation
            if (tokens > max_tokens * 0.8) {
                prompts.splice(1, 2);
                prompts[0] = { role: 'system', content: promptImpersonate };
            }
        }
        addMessage('bot', data.message);
    } catch (error) {
        addMessage('bot', error.message);
    }
};

// Send message on form submit
messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        sendMessage(message);
    }
});

messageInput.focus();



// request /api/prompt_repo build queryString to transfer usernameInput value as username to server
// it will return a json object with username and a data array
// output the data array and the username in console
userForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    modal.style.display = 'none';
    if (username) {
        fetch(`/api/prompt_repo?username=${username}`)
            .then(response => response.json())
            .then(data => {
                renderMenuList(data);
            });
    }
});


// 当点击触发器时显示模态对话框
usernameLabel.addEventListener('click', function () {
    modal.style.display = 'block';
});

// 当点击模态对话框外部时关闭模态对话框
document.addEventListener('click', function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
});

// add click event listener to each message speaker icon
function attachMessageSpeakerEvent() {
    const messageSpeakers = document.querySelectorAll('.message-speaker');
    //add click event listener to each speaker
    messageSpeakers.forEach(speaker => {
        speaker.addEventListener('click', () => {
            //prevent user from clicking the speaker icon multiple times
            if (speaker.classList.contains('fa-volume-up')) {
                return;
            }
            //change the speaker icon from fa-volume-mute to fa-volume-up
            const toggleSpeakerIcon = () => {
                speaker.classList.toggle('fa-volume-off');
                speaker.classList.toggle('fa-volume-up');
            };
            toggleSpeakerIcon();
            //get message from speakerElement dataset
            const message = speaker.dataset.message;
            const url = `/api/tts?message=${encodeURIComponent(message)}`;
            fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    console.log('ready to play...');
                    const audio = new Audio();
                    audio.src = URL.createObjectURL(blob);

                    //check if the audio is finished playing or failed to play
                    audio.onerror = () => {
                        toggleSpeakerIcon();
                        console.error('Error playing audio.');
                    };
                    audio.onended = () => {
                        toggleSpeakerIcon();
                    };
                    audio.play();
                })
                .catch(error => {
                    console.error(error);
                    toggleSpeakerIcon();

                });
        });
    });
}

// render menu list from data
function renderMenuList(data) {
    const profiles = data.profiles;
    //empty menu list
    menuList.innerHTML = '';
    usernameLabel.textContent = data.username;
    //add menu items
    profiles.forEach(item => {
        let li = document.createElement('li');
        li.dataset.profile = item.name;
        let icon = document.createElement('i');
        icon.className = `fas ${item.icon}`;
        let span = document.createElement('span');
        span.textContent = item.displayName;
        li.appendChild(icon);
        li.appendChild(span);
        menuList.appendChild(li);
        //add click event listener
        li.addEventListener('click', function () {
            // 获取与该列表项关联的 profile 数据  
            var profileName = this.getAttribute('data-profile');
            currentProfile = profiles.find(function (p) { return p.name === profileName; });
            if (currentProfile && currentProfile.tts === 'enabled') {
                // if ttsContainer is not display, then display it
                ttsContainer.style.display = 'inline-block';
            } else {
                // if ttsContainer is display, then hide it
                ttsContainer.style.display = 'none';
            }
            // 设置 profile 图标和名称
            aiProfile.innerHTML = `<i class="fas ${currentProfile.icon}"></i> ${currentProfile.displayName}`;
            // 显示 profile 数据  
            addMessage('system', currentProfile.prompt);
            // 清空 prompts 数组
            prompts.splice(0, prompts.length);
            prompts.push({ role: 'system', content: currentProfile.prompt });
        });
    });
}
