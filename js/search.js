const workers = [

    {
        id: 1,
        name: "Juan Dela Cruz",
        role: "Graphic Designer",
        category: "design",
        location: "Cebu City",
        rating: 4.9,
        skills: [
            "Logo Design",
            "Branding",
            "Photoshop"
        ]
    },

    {
        id: 2,
        name: "Ana Marie Santos",
        role: "Web Developer",
        category: "development",
        location: "Mandaue",
        rating: 4.8,
        skills: [
            "HTML",
            "CSS",
            "JavaScript"
        ]
    },

    {
        id: 3,
        name: "Rico Cruz",
        role: "Electrician",
        category: "repair",
        location: "Cebu City",
        rating: 4.7,
        skills: [
            "Electrical",
            "Wiring",
            "Repair"
        ]
    },

    {
        id: 4,
        name: "Mark Santos",
        role: "Photographer",
        category: "photography",
        location: "Lapu-Lapu",
        rating: 4.9,
        skills: [
            "Portrait",
            "Events",
            "Editing"
        ]
    },

    {
        id: 5,
        name: "Daniel Reyes",
        role: "Music Producer",
        category: "music",
        location: "Cebu City",
        rating: 4.6,
        skills: [
            "Mixing",
            "Mastering",
            "Production"
        ]
    }

];


const searchInput =
    document.getElementById("searchInput");

const categoryFilter =
    document.getElementById("categoryFilter");

const locationFilter =
    document.getElementById("locationFilter");

const ratingFilter =
    document.getElementById("ratingFilter");

const results =
    document.getElementById("searchResults");


function renderWorkers(list) {

    results.innerHTML = "";


    if (list.length === 0) {

        results.innerHTML = `
            <div class="card result-card">
                <h3>No workers found.</h3>
                <p>
                    Try changing your search or filters.
                </p>
            </div>
        `;

        return;
    }


    list.forEach(worker => {

        const card = document.createElement("article");

        card.className =
            "card result-card";


        card.innerHTML = `

            <div class="result-top">

                <div class="result-avatar">
                    ${getInitials(worker.name)}
                </div>

                <div>

                    <h3>
                        ${worker.name}
                    </h3>

                    <div class="result-role">
                        ${worker.role}
                    </div>

                    <div class="result-location">
                        ${worker.location}
                    </div>

                </div>

            </div>


            <div class="rating">
                ★★★★★
                <span>
                    ${worker.rating}
                </span>
            </div>


            <div class="result-skills">

                ${worker.skills
                    .map(skill =>
                        `<span class="skill">
                            ${skill}
                        </span>`
                    )
                    .join("")}

            </div>


            <a
                href="profile.html?id=${worker.id}"
                class="btn btn-secondary"
            >
                View Profile
            </a>

        `;


        results.appendChild(card);

    });

}


function getInitials(name) {

    return name
        .split(" ")
        .map(word => word[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

}


function filterWorkers() {

    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    const category =
        categoryFilter.value;


    const location =
        locationFilter.value
            .toLowerCase()
            .trim();


    const minimumRating =
        Number(ratingFilter.value);


    const filtered =
        workers.filter(worker => {

            const searchableText = (

                worker.name +
                " " +
                worker.role +
                " " +
                worker.skills.join(" ")

            ).toLowerCase();


            const matchesSearch =
                searchableText.includes(search);


            const matchesCategory =
                category === "all" ||
                worker.category === category;


            const matchesLocation =
                location === "" ||
                worker.location
                    .toLowerCase()
                    .includes(location);


            const matchesRating =
                worker.rating >= minimumRating;


            return (
                matchesSearch &&
                matchesCategory &&
                matchesLocation &&
                matchesRating
            );

        });


    renderWorkers(filtered);

}


searchInput.addEventListener(
    "input",
    filterWorkers
);

categoryFilter.addEventListener(
    "change",
    filterWorkers
);

locationFilter.addEventListener(
    "input",
    filterWorkers
);

ratingFilter.addEventListener(
    "change",
    filterWorkers
);


renderWorkers(workers);