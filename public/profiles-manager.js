
const getCurrentUsername = () => { return localStorage.getItem('currentUsername') || 'guest' };




$(function () {
    // Fetch profiles from server and display on page
    fetchProfiles();

    // Save profile button event
    $("#save-profile").on("click", function () {
        saveProfile();
    });

    $('#icon').on('change', function() {
        const iconClass = $(this).val();  
        $('#icon-preview').attr('class', iconClass);
    });
});

function fetchProfiles() {
    // Fetch profiles from server, replace the URL with your API endpoint
    fetch("/profiles?username=" + getCurrentUsername())
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
                    <p class="card-text">Sorted Index: ${profile.sortedIndex}</p>
                    <button class="btn btn-primary edit-profile" data-bs-toggle="modal" data-bs-target="#profile-modal">Edit</button>
                    <button class="btn btn-danger delete-profile">Delete</button>
                </div>
            </div>
        </div>`;
    });
    $("#profile-list").html(output);

    // Add event listeners for edit and delete buttons
    $("#profile-list").on("click", ".edit-profile", function () {
        // Get profile details from card
        const name = $(this).parent().find("h5").text();
        const icon = $(this).parent().find("i").attr("class");
        const displayName = $(this).parent().find("p.card-text").eq(0).text();
        const prompt = $(this).parent().find("p.card-text").eq(1).text();
        const sortedIndex = $(this).parent().find("p.card-text").eq(2).text().split(': ')[1];

        // Set form fields with profile data
        $("#name").val(name);
        //populate the icon preview
        $("#icon-preview").attr("class", icon);
        $("#icon").val(icon);
        $("#displayName").val(displayName);
        $("#prompt").val(prompt);
        $("#tts").val("disabled");
        $("#sortedIndex").val(sortedIndex);

        // Change Save button to Update
        $("#save-profile").off("click").text("Update").on("click", function () {
            updateProfile(name);
        });
    });

    $("#profile-list").on("click", ".delete-profile", function () {
        // Get profile name from card
        const name = $(this).parent().find("h5").text();

        // Delete profile using API, replace the URL with your API endpoint
        fetch(`/profiles/${name}?username=${getCurrentUsername()}`, {
            method: "DELETE"
        })
            .then(response => response.json())
            .then(() => {
                // Refresh profiles list
                fetchProfiles();
            });
    });

    function updateProfile(oldName) {
        // Get form data
        const updatedProfile = {
            name: $("#name").val(),
            icon: $("#icon").val(),
            displayName: $("#displayName").val(),
            prompt: $("#prompt").val(),
            tts: $("#tts").val(),
            sortedIndex: $("#sortedIndex").val()
        };

        //if display name is empty, set it to the name
        if (updatedProfile.displayName === "") {
            updatedProfile.displayName = updatedProfile.name;
        }

        // Send data to server, replace the URL with your API endpoint
        // send currentUsername as username in the query string
        fetch(`/profiles/${oldName}?username=${getCurrentUsername()}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedProfile)
        })
            .then(response => response.json())
            .then(() => {
                // Refresh profiles list
                fetchProfiles();
            });

        // Clear form and restore Save button functionality
        $("#profile-form")[0].reset();
        $("#save-profile").off("click").text("Save").on("click", function () {
            saveProfile();
        });
    }
}

function saveProfile() {
    // Get form data
    const newProfile = {
        name: $("#name").val(),
        icon: $("#icon").val(),
        displayName: $("#displayName").val(),
        prompt: $("#prompt").val(),
        tts: $("#tts").val()
    };

    //if display name is empty, set it to the name
    if (newProfile.displayName === "") {
        newProfile.displayName = newProfile.name;
    }

    // Send data to server, replace the URL with your API endpoint
    fetch(`/profiles?username=${getCurrentUsername()}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(newProfile)
    })
        .then(response => response.json())
        .then(() => {
            // Refresh profiles list
            fetchProfiles();
        });

    // Clear form
    $("#profile-form")[0].reset();
}
