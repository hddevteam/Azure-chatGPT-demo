const promptImpersonate = 'You are an AI assistant that helps people find information.';
const aiProfile = document.querySelector('#ai-profile');
const messagesContainer = document.querySelector('#messages');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message-input');
const tokensSpan = document.querySelector('#tokens');
const exportExcel = document.querySelector('#export-excel');

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
    messageElement.dataset.message = message;
    messageElement.dataset.sender = sender;

    //if send is user
    if (sender === 'user') {
        const pre = document.createElement('pre');
        pre.innerText = message;
        messageElement.appendChild(pre);
    } else {
        messageElement.innerHTML = marked.parse(message);
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
    const autoPlay = ttsPracticeMode && sender === 'bot';
    if (autoPlay) {
        playMessage(lastSpeaker);
    }

    // find the last message-copy and add click event listener to it
    const messageCopies = document.querySelectorAll('.message-copy');
    const lastCopy = messageCopies[messageCopies.length - 1];
    attachMessageCopyEvent(lastCopy);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

};

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

    // 添加事件监听器
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

// 定义函数将文本变量分成最多160个单词的句子集合数组
function splitMessage(message) {
    let sentenceArr = [];
    let words = message.split(" ");
    let sentence = "";
    let i = 0;
    while (i < words.length) {
        // 将单词逐一添加到当前句子中
        if (sentence.length === 0) {
            sentence = words[i];
        } else {
            sentence = sentence + " " + words[i];
        }
        i++;
        // 如果当前句子的单词数达到160个或到达文本结尾，则添加到句子集合中，并清空当前句子
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

    // 循环播放句子集合中的每个句子
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
        icon.className = `${item.icon}`;
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
            // 显示 profile 数据  
            addMessage('system', currentProfile.prompt);
            // 清空 prompts 数组
            prompts.splice(0, prompts.length);
            prompts.push({ role: 'system', content: currentProfile.prompt });
        });
    });
}
