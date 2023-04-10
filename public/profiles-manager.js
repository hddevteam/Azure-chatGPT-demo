$(document).ready(function () {
    // Fetch profiles from server and display on page
    fetchProfiles();

    // Save profile button event
    $("#save-profile").click(function () {
        saveProfile();
    });
});

function fetchProfiles() {
    // Fetch profiles from server, replace the URL with your API endpoint
    fetch("/profiles")
        .then(response => response.json())
        .then(data => displayProfiles(data));
}

function displayProfiles(profiles) {
    let output = "";
    profiles.forEach(profile => {
        output += `
                <div class="col-md-4">
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="card-title">
                                <h5>${profile.name}</h5>
                                <i class="${profile.icon}"></i>
                            </div>
                            <p class="card-text">${profile.displayName}</p>
                            <p class="card-text">${profile.prompt}</p>
                            <button class="btn btn-primary edit-profile" data-toggle="modal" data-target="#profile-modal">Edit</button>
                            <button class="btn btn-danger delete-profile">Delete</button>
                        </div>
                    </div>
                </div>`;
    });

    $("#profile-list").html(output);

    // Add event listeners for edit and delete buttons
    $(".edit-profile").click(function () {
        // Get profile details from card
        const name = $(this).parent().find("h5").text();
        const icon = $(this).parent().find("i").attr("class");
        const displayName = $(this).parent().find("p.card-text").eq(0).text();
        const prompt = $(this).parent().find("p.card-text").eq(1).text();

        // Set form fields with profile data
        $("#name").val(name);
        $("#icon").val(icon);
        $("#displayName").val(displayName);
        $("#prompt").val(prompt);
        $("#tts").val("disabled");

        // Change Save button to Update
        $("#save-profile").off("click").text("Update").click(function () {
            updateProfile(name);
        });
    });

    $(".delete-profile").click(function () {
        // Get profile name from card
        const name = $(this).parent().find("h5").text();

        // Delete profile using API, replace the URL with your API endpoint
        fetch(`/profiles/${name}`, {
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
            tts: $("#tts").val()
        };

        // Send data to server, replace the URL with your API endpoint
        fetch(`/profiles/${oldName}`, {
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
        $("#save-profile").off("click").text("Save").click(function () {
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

    // Send data to server, replace the URL with your API endpoint
    fetch("/profiles", {
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
