const aiProfile = document.querySelector('#ai-profile');
const messagesContainer = document.querySelector('#messages');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message-input');
const tokensSpan = document.querySelector('#tokens');
const exportExcel = document.querySelector('#export-excel');

// get and set page title and header h1 text from /api/app-name
const pageTitle = document.querySelector('title');
const headerH1 = document.querySelector('#header h1');
// /api/app-name will return the app name from .env file
fetch('/api/app_name')
    .then(response => response.text())
    .then(appName => {
        pageTitle.innerText = appName;
        headerH1.innerText = appName;
    });

// 获取模态对话框元素和触发器元素
const modal = document.querySelector('.modal');
const usernameLabel = document.querySelector('#username-label');
const userForm = document.querySelector('#user-form');
const usernameInput = document.querySelector('#username-input');

// get tts container element
const ttsContainer = document.querySelector('#tts-container');
ttsContainer.style.display = 'none';

const practiceMode = document.querySelector('#practice-mode');
const practiceModeIcon = document.querySelector('#practice-mode-icon');
var ttsPracticeMode = false; // practice mode is off by default
// add click event listener to practiceMode
practiceMode.addEventListener('click', () => {
    // if ttsPracticeMode is false, then set it to true
    if (!ttsPracticeMode) {
        turnOnPracticeMode();
    } else {
        turnOffPracticeMode();
        // reset all the speaker icon to fas fa-volume-off
        // so that if the speaker is broken, it will can be clicked again
        const speakerElements = document.querySelectorAll('.message-speaker');
        speakerElements.forEach(speakerElement => {
            speakerElement.classList.remove('fa-volume-up');
            speakerElement.classList.add('fa-volume-off');
        });
    }
});

// add click event listener to exportExcel
exportExcel.addEventListener('click', () => {
    // get all the messages
    const messages = document.querySelectorAll('.message');
    // get the conversion from each message element's data-message attribute
    const conversions = [];
    messages.forEach(message => {
        conversions.push({ sender: message.dataset.sender, message: message.dataset.message });
    });

    // convert the conversion array to csv string
    const convertToCSV = (objArray) => {
        var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
        var str = '';

        for (var i = 0; i < array.length; i++) {
            var line = '';
            for (var index in array[i]) {
                if (line != '') line += ',';
                line += '"' + array[i][index].replace(/"/g, '""') + '"';
            }
            str += line + '\r\n';
        }

        return str;
    }

    csv = convertToCSV(conversions);

    // create a hidden link element
    const link = document.createElement('a');
    link.style.display = 'none';
    // set the href attribute to the csv string
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    // set the download attribute to the file name
    // set file name to azure_gpt_conversations + current date time
    const date = new Date();
    const fileName = 'azure_gpt_conversations_' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '_' + date.getHours() + '-' + date.getMinutes() + '.csv';
    link.setAttribute('download', fileName);
    // append the link element to the body
    document.body.appendChild(link);
    // click the link element
    link.click();
    // remove the link element from the body
    document.body.removeChild(link);
});


const showToast = (message) => {
    var toast = document.getElementById("toast");
    toast.innerHTML = message;
    toast.style.display = "block";
    setTimeout(function () {
        toast.style.display = "none";
    }, 3000); // 3 秒后隐藏 Toast
}

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
let tokens = 0
let prompts = [];
const max_tokens = 4000;
var currentProfile = null;


fetch('/api/prompt_repo')
    .then(response => response.json())
    .then(data => {
        renderMenuList(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });


// Add message to DOM
const addMessage = (sender, message, messageId) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(`${sender}-message`);
    messageElement.dataset.message = message;
    messageElement.dataset.sender = sender;
    messageElement.dataset.messageId = messageId;

    //add fa-comments icon to message with class message-conversation and fas fa-comments
    const conversationElement = document.createElement('i');
    conversationElement.classList.add('message-conversation');
    conversationElement.classList.add('fas');
    conversationElement.classList.add('fa-quote-left');
    messageElement.appendChild(conversationElement);

    // if sender is not system
    if (sender !== 'system') {
        //add fa-trash icon to message with class message-delete and fas fa-trash
        const deleteElement = document.createElement('i');
        deleteElement.classList.add('message-delete');
        deleteElement.classList.add('fas');
        deleteElement.classList.add('fa-times');
        messageElement.appendChild(deleteElement);
        //add onclick event listener to deleteElement
        deleteElement.addEventListener('click', () => {
            // get the message id from messageElement's dataset
            const messageId = messageElement.dataset.messageId;
            deleteMessage(messageId);
        });
    }

    //if send is user
    if (sender === 'user') {
        const pre = document.createElement('pre');
        pre.innerText = message;
        messageElement.appendChild(pre);
    } else {
        // 将 Markdown 文本转换为 HTML
        const messageHtml = marked.parse(message);
        // 创建一个新的 DOM 元素
        const messageHtmlElement = document.createElement('div');
        // 将生成的 HTML 设置为新元素的 innerHTML
        messageHtmlElement.innerHTML = messageHtml;
        messageElement.appendChild(messageHtmlElement);
    }

    const iconGroup = document.createElement('div');
    iconGroup.classList.add('icon-group');

    //add a copy icon to message with class message-copy and fas fa-copy
    const copyElement = document.createElement('i');
    copyElement.classList.add('message-copy');
    copyElement.classList.add('fas');
    copyElement.classList.add('fa-copy');
    //add message to copyElement dataset
    iconGroup.appendChild(copyElement);

    //check if current profile.tts is exist and value with "enabled"
    if (currentProfile && currentProfile.tts === 'enabled') {
        //create speaker icon
        const speakerElement = document.createElement('i');
        speakerElement.classList.add('message-speaker');
        speakerElement.classList.add('fas');
        speakerElement.classList.add('fa-volume-off');
        iconGroup.appendChild(speakerElement);
    } else {
        // if ttsContainer is display, then hide it
        if (ttsContainer.style.display === 'inline-block') {
            ttsContainer.style.display = 'none';
        }
    }

    messageElement.appendChild(iconGroup);
    messagesContainer.appendChild(messageElement);
    const messageSpeakers = document.querySelectorAll('.message-speaker');
    const lastSpeaker = messageSpeakers[messageSpeakers.length - 1];
    attachMessageSpeakerEvent(lastSpeaker);

    // Determine if the message should be played automatically
    const autoPlay = ttsPracticeMode && sender === 'assistant';
    if (autoPlay) {
        playMessage(lastSpeaker);
    }

    // find the last message-copy and add click event listener to it
    const messageCopies = document.querySelectorAll('.message-copy');
    const lastCopy = messageCopies[messageCopies.length - 1];
    attachMessageCopyEvent(lastCopy);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

// implement deleteMessage function
const deleteMessage = (messageId) => {
    // remove message from DOM and also from prompt array by message id 
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    messageElement.remove();
    prompts = prompts.filter(prompt => prompt.messageId !== messageId);
    saveCurrentProfileMessages();
}

// implement attachMessageCopyEvent function
const attachMessageCopyEvent = (messageCopy) => {
    // 实例化clipboard.js
    var clipboard = new ClipboardJS(messageCopy, {
        text: function (trigger) {
            // 获取爷爷节点的data-message属性内容
            var message = trigger.parentNode.parentNode.getAttribute('data-message');
            //convert the html escape characters to normal characters
            const textElement = document.createElement('textarea');
            textElement.innerHTML = message;
            message = textElement.value;

            return message;
        }
    });

    clipboard.on('success', function (e) {
        showToast('copied successful');
    });

    clipboard.on('error', function (e) {
        showToast('copied failed');
    });

};


// attach speaker event to message speaker
const attachMessageSpeakerEvent = (speaker) => {
    if (!speaker) {
        return;
    }
    speaker.addEventListener('click', async () => {
        await playMessage(speaker);
    });
}

const turnOnPracticeMode = () => {
    ttsPracticeMode = true;
    practiceMode.innerText = 'Practice Mode: On';
    practiceModeIcon.classList.remove('fa-volume-off');
    practiceModeIcon.classList.add('fa-volume-up');
}

const turnOffPracticeMode = () => {
    ttsPracticeMode = false;
    practiceMode.innerText = 'Practice Mode: Off';
    practiceModeIcon.classList.remove('fa-volume-up');
    practiceModeIcon.classList.add('fa-volume-off');
}

// split message into sentences chunks with max 160 words each
function splitMessage(message) {
    let sentenceArr = [];
    let words = message.split(" ");
    let sentence = "";
    let i = 0;
    while (i < words.length) {
        // if current sentence is empty, then add the first word to it
        if (sentence.length === 0) {
            sentence = words[i];
        } else {
            sentence = sentence + " " + words[i];
        }
        i++;
        // if current sentence is 160 words or it is the last word, then add it to sentenceArr
        if (sentence.split(" ").length === 160 || i === words.length) {
            sentenceArr.push(sentence);
            sentence = "";
        }
    }
    return sentenceArr;
}

const audio = new Audio();
var currentPlayingSpeaker; // Add this variable to keep track of the current playing speaker
const toggleSpeakerIcon = (speaker) => {
    speaker.classList.toggle('fa-volume-off');
    speaker.classList.toggle('fa-volume-up');
};
const playAudio = async (speaker) => {
    return new Promise((resolve, reject) => {
        audio.onerror = () => {
            toggleSpeakerIcon(speaker);
            currentPlayingSpeaker = null;
            console.error('Error playing audio.');
            resolve();
        };
        audio.onended = () => {
            toggleSpeakerIcon(speaker);
            currentPlayingSpeaker = null;
            resolve();
        };
        audio.onabort = () => {
            console.error('Audio play aborted.');
            resolve();
        };
        audio.play();
    });
};

// play the message with tts
async function playMessage(speaker) {
    // if the speaker is playing, stop it and return
    if (speaker.classList.contains('fa-volume-up')) {
        //if the audio is playing, stop it
        audio.pause();
        toggleSpeakerIcon(speaker);
        currentPlayingSpeaker = null;
        return;
    }
    // If there is a speaker currently playing, stop it and reset its icon
    if (currentPlayingSpeaker && currentPlayingSpeaker !== speaker) {
        audio.pause();
        toggleSpeakerIcon(currentPlayingSpeaker); // Reset the icon of the previous speaker
    }

    // Update the currentPlayingSpeaker variable
    currentPlayingSpeaker = speaker;

    //get message from parent element dataset message attribute
    const message = speaker.parentElement.parentElement.dataset.message;
    let sentenceArr = splitMessage(message);
    console.log(sentenceArr);

    // play sentences chunk one by one
    const playSentences = async () => {
        for (let sentence of sentenceArr) {
            toggleSpeakerIcon(speaker);
            try {
                const url = `/api/tts?message=${encodeURIComponent(sentence)}`;
                const response = await fetch(url);
                const blob = await response.blob();
                console.log('ready to play...');
                audio.src = URL.createObjectURL(blob);
                await playAudio(speaker);
            } catch (error) {
                toggleSpeakerIcon(speaker);
                console.error(error);
            }
        }
    };

    // 使用Promise.all确保异步操作完成
    await Promise.all([playSentences()]);

}
// generate unique id
const generateId = () => {
    return Math.random().toString(36).slice(2, 10);
};

// Clear message input
const clearMessage = () => {
    messagesContainer.innerHTML = '';
    messageInput.value = '';
    prompts.splice(0, prompts.length, { role: 'system', content: currentProfile.prompt });
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
        let messageId = generateId();
        addMessage('system', message, messageId);
        prompts.splice(0, prompts.length);
        prompts.push({ role: 'system', content: message, messageId: messageId });
        return;
    }
    let messageId = generateId();
    addMessage('user', message, messageId);
    prompts.push({ role: 'user', content: message, messageId: messageId });
    saveCurrentProfileMessages();
    // join prompts except the messageId field to a string
    const promptText = JSON.stringify(prompts.map((p) => {
        return { role: p.role, content: p.content };
    }));

    console.log(promptText);
    messageInput.value = '';

    // if practice mode is on then messageInput get focus
    if (ttsPracticeMode) {
        messageInput.focus();
    }

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
                prompts[0] = { role: 'system', content: currentProfile.prompt };
            }
        }
        let messageId = generateId();
        addMessage('assistant', data.message, messageId);
        saveCurrentProfileMessages();
    } catch (error) {
        let messageId = generateId();
        addMessage('assistant', error.message, messageId);
    }
};

// Send message on form submit
messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        sendMessage(message);
    }
    messageInput.focus();
});


var currentUsername = '';
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
                //practice mode will be off when user submit the username
                turnOffPracticeMode();
            });
    }
});

// popup the modal when user click the username label
usernameLabel.addEventListener('click', function () {
    modal.style.display = 'block';
});

// close the modal when user click the close button
document.addEventListener('click', function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
});

// save the current message content to local storage by username and profile name
const saveCurrentProfileMessages = () => {
    const messages = document.querySelectorAll('.message');
    const savedMessages = [];
    messages.forEach(message => {
        // only save user and assistant messages
        if (message.dataset.sender === 'user' || message.dataset.sender === 'assistant') {
            if (message.dataset.messageId === 'undefined') {
                savedMessages.push({ role: message.dataset.sender, content: message.dataset.message, messageId: generateId() });
            } else {
                savedMessages.push({ role: message.dataset.sender, content: message.dataset.message, messageId: message.dataset.messageId });
            }
        }
    });
    localStorage.setItem(currentUsername + '_' + currentProfile.name, JSON.stringify(savedMessages));
};

// render menu list from data
// it only happens when user submit the username or the page is loaded
function renderMenuList(data) {
    const profiles = data.profiles;
    currentUsername = data.username;
    usernameLabel.textContent = currentUsername;
    currentProfile = profiles[0]; // set currentProfile to the first profile
    let messageId = generateId();
    prompts.push({ role: 'system', content: currentProfile.prompt, messageId: messageId });
    addMessage('system', currentProfile.prompt, messageId);

    // read saved messages from local storage for current profile and current username
    const savedMessages = JSON.parse(localStorage.getItem(currentUsername + '_' + currentProfile.name) || '[]');
    savedMessages.forEach(message => {
        addMessage(message.role, message.content, message.messageId);
    });

    // load last 2 messages(max) from savedMessages
    if (savedMessages.length > 2) {
        prompts.push(savedMessages[savedMessages.length - 2]);
        prompts.push(savedMessages[savedMessages.length - 1]);
    } else if
        (savedMessages.length > 0) {
        prompts.push(savedMessages[savedMessages.length - 1]);
    }

    //empty menu list
    menuList.innerHTML = '';

    //add menu items
    profiles.forEach(item => {
        let li = document.createElement('li');
        li.dataset.profile = item.name;
        let icon = document.createElement('i');
        icon.className = `${item.icon}`;
        let span = document.createElement('span');
        span.textContent = item.displayName;
        li.appendChild(icon);
        li.appendChild(span);
        menuList.appendChild(li);
        //add click event listener
        li.addEventListener('click', function () {
            // reset practice mode
            turnOffPracticeMode();
            // change currentProfile
            var profileName = this.getAttribute('data-profile');
            currentProfile = profiles.find(function (p) { return p.name === profileName; });
            // 如果当前 profile 的 tts 属性为 enabled，则显示 ttsContainer
            if (currentProfile && currentProfile.tts === 'enabled') {
                // if ttsContainer is not display, then display it
                ttsContainer.style.display = 'inline-block';
            } else {
                // if ttsContainer is display, then hide it
                ttsContainer.style.display = 'none';
            }
            // 设置 profile 图标和名称
            aiProfile.innerHTML = `<i class="${currentProfile.icon}"></i> ${currentProfile.displayName}`;
            messagesContainer.innerHTML = '';
            // 清空 prompts 数组
            prompts.splice(0, prompts.length);
            let messageId = generateId();
            prompts.push({ role: 'system', content: currentProfile.prompt, messageId: messageId });
            addMessage('system', currentProfile.prompt, messageId);
            // read saved messages from local storage for current profile and current username
            const savedMessages = JSON.parse(localStorage.getItem(currentUsername + '_' + currentProfile.name) || '[]');
            savedMessages.forEach(message => {
                addMessage(message.role, message.content, message.messageId);
            });

            // load last 2 messages(max) from savedMessages to prompts: sender => role, message => content
            if (savedMessages.length > 2) {
                prompts.push(savedMessages[savedMessages.length - 2]);
                prompts.push(savedMessages[savedMessages.length - 1]);
            } else if
                (savedMessages.length > 0) {
                prompts.push(savedMessages[savedMessages.length - 1]);
            }
        });
    });
}
