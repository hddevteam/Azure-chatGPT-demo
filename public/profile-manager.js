// public/profile-manager.js
/* eslint-disable no-undef */

// purpose: to manage the ai profiles(system prompt) of current user

import { getCurrentUsername } from "./storage.js";
import { getDefaultParams } from "./api.js";

const showAlert = (type, message) => {
    var alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    $("#alert-container").html(alertHtml);
};

async function init() {
    const defaultParams = await getDefaultParams();
    $("#temperature").attr("placeholder", defaultParams.temperature + " (default)");
    $("#top_p").attr("placeholder", defaultParams.top_p + " (default)");
    $("#frequency_penalty").attr("placeholder", defaultParams.frequency_penalty + " (default)");
    $("#presence_penalty").attr("placeholder", defaultParams.presence_penalty + " (default)");
    $("#max_tokens").attr("placeholder", defaultParams.max_tokens + " (default)");
}

$(function () {
    init();
    if (getCurrentUsername() === "guest") {
        showAlert("warning", "You are currently logged in as guest. You can not edit the profile.");
    }

    fetchProfiles();

    $("#save-profile").on("click", function () {
        saveProfile();
    });

    $("#icon").on("change", function () {
        const iconClass = $(this).val();
        $("#icon-preview").attr("class", iconClass);
    });
});

function fetchProfiles() {
    fetch("/api/profiles?username=" + getCurrentUsername())
        .then(response => response.json())
        .then(data => displayProfiles(data));
}

function displayProfiles(profiles) {
    let output = "";
    profiles.forEach(profile => {
        output += `
        <div class="col-lg-4">
            <div class="card mb-4">
                <div class="card-body">
                    <div class="card-title">
                        <h5>${profile.name}</h5>
                        <i class="${profile.icon}"></i>
                    </div>
                    <p class="card-text">${profile.displayName}</p>
                    <p class="card-text">${profile.prompt}</p>
                    <p class="card-text">TTS: ${profile.tts}</p>
                    <p class="card-text">Sorted Index: ${profile.sortedIndex}</p>
                    <p class="card-text">Temperature: ${profile.temperature || "n/a"}</p>
                    <p class="card-text">Top P: ${profile.top_p || "n/a"}</p>
                    <p class="card-text">Frequency Penalty: ${profile.frequency_penalty || "n/a"}</p>
                    <p class="card-text">Presence Penalty: ${profile.presence_penalty || "n/a"}</p>
                    <p class="card-text">Max Tokens: ${profile.max_tokens || "n/a"}</p>
                    <button class="btn btn-primary edit-profile" data-bs-toggle="modal" data-bs-target="#profile-modal" name="${profile.name}">Edit</button>
                    <button class="btn btn-danger delete-profile" name="${profile.name}">Delete</button>
                    <button class="btn btn-secondary duplicate-profile" name="${profile.name}">Duplicate</button>
                </div>
            </div>
        </div>`;
    });
    $("#profile-list").html(output);

    $("#profile-list").on("click", ".edit-profile", function () {
        const name = $(this).attr("name");
        const profile = profiles.find(profile => profile.name === name);

        $("#name").val(profile.name);
        $("#icon-preview").attr("class", profile.icon);
        $("#icon").val(profile.icon);
        $("#displayName").val(profile.displayName);
        $("#prompt").val(profile.prompt);
        $("#tts").val(profile.tts);
        $("#sortedIndex").val(profile.sortedIndex);
        $("#temperature").val(profile.temperature);
        $("#top_p").val(profile.top_p);
        $("#frequency_penalty").val(profile.frequency_penalty);
        $("#presence_penalty").val(profile.presence_penalty);
        $("#max_tokens").val(profile.max_tokens);

        $("#save-profile").off("click").text("Update").on("click", function () {
            updateProfile(name);
        });
    });

    $("#profile-list").on("click", ".delete-profile", function () {
        const name = $(this).attr("name");

        fetch(`/api/profiles/${name}?username=${getCurrentUsername()}`, {
            method: "DELETE"
        })
            .then(response => response.json())
            .then(() => {
                fetchProfiles();
            });
    });

    $("#profile-list").on("click", ".duplicate-profile", function () {
        const name = $(this).attr("name");
        const profile = profiles.find(profile => profile.name === name);

        const newProfile = { ...profile, name: `${profile.name}-copy`, displayName: `${profile.displayName} (Copy)` };

        fetch(`/api/profiles?username=${getCurrentUsername()}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newProfile)
        })
            .then(response => response.json())
            .then(() => {
                fetchProfiles();
            });
    });

    function updateProfile(oldName) {
        const updatedProfile = {
            name: $("#name").val(),
            icon: $("#icon").val(),
            displayName: $("#displayName").val(),
            prompt: $("#prompt").val(),
            tts: $("#tts").val(),
            sortedIndex: $("#sortedIndex").val(),
            temperature: $("#temperature").val(),
            top_p: $("#top_p").val(),
            frequency_penalty: $("#frequency_penalty").val(),
            presence_penalty: $("#presence_penalty").val(),
            max_tokens: $("#max_tokens").val(),
        };

        if (updatedProfile.displayName === "") {
            updatedProfile.displayName = updatedProfile.name;
        }

        fetch(`/api/profiles/${oldName}?username=${getCurrentUsername()}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedProfile)
        })
            .then(response => response.json())
            .then(() => {
                fetchProfiles();
            });

        $("#profile-form")[0].reset();
        $("#save-profile").off("click").text("Save").on("click", function () {
            saveProfile();
        });
    }
}

function saveProfile() {
    const newProfile = {
        name: $("#name").val(),
        icon: $("#icon").val(),
        displayName: $("#displayName").val(),
        prompt: $("#prompt").val(),
        tts: $("#tts").val(),
        sortedIndex: $("#sortedIndex").val(),
        temperature: $("#temperature").val(),
        top_p: $("#top_p").val(),
        frequency_penalty: $("#frequency_penalty").val(),
        presence_penalty: $("#presence_penalty").val(),
        max_tokens: $("#max_tokens").val(),
    };

    if (newProfile.displayName === "") {
        newProfile.displayName = newProfile.name;
    }

    fetch(`/api/profiles?username=${getCurrentUsername()}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(newProfile)
    })
        .then(response => response.json())
        .then(() => {
            fetchProfiles();
        });

    $("#profile-form")[0].reset();
}
