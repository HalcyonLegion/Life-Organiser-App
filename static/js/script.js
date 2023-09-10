function cleanApiResponse(responseText) {
  let scheduleText = '';
  let inJson = false;
  let responseArray = responseText.split('\n');
  
  for (let line of responseArray) {
    // Start capturing lines that start with [
    if (line.trim().startsWith("[")) {
      inJson = true;
    }

    // If we're inside the JSON, add the line to scheduleText
    if (inJson) {
      scheduleText += line;
    }

    // Stop capturing when line starts with ]
    if (line.trim().startsWith("]")) {
      inJson = false;
    }
  }

  console.log("JSON text:", scheduleText);

  // Note: Replace single quotes with double quotes around keys
  scheduleText = scheduleText.replace(/'([^']+)'/g, '"$1"');
  
  // Parse the cleared JSON text and return it
  return JSON.parse(scheduleText);
}

function parseSchedule(scheduleArray) {
  let parsedEvents = [];

  if (Array.isArray(scheduleArray)) {
    for (let event of scheduleArray) {
      const startDateTime = new Date(event.day + "T" + event.startTime + ":00");
      const endDateTime = new Date(event.day + "T" + event.endTime + ":00");

      parsedEvents.push({
        start: startDateTime,
        end: endDateTime,
        title: event.title
      });
    }
  } else {
    console.warn("The schedule property is missing or not an array.");
  }
  console.log("Parsed events:", parsedEvents);
  return parsedEvents;
}

async function fetchSchedule(prompt) {
  try {
    const response = await fetch("/generate-schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error("Server error");
    }
    const jsonResponse = await response.json();
    return jsonResponse.schedule;
  } catch (error) {
    console.error("Server error:", error);
    document.getElementById("errorMessage").style.display = "block";
    document.getElementById("errorMessage").innerText = "An error occurred during the process: " + error.message;
    return [];
  }
}

// Hides error message, test it.
document.getElementById("errorMessage").style.display = "none";

function generateMonthView(className) {
  let calendarContainer = $(className);

  calendarContainer.fullCalendar({
    header: {
      left: "prev,next today",
      center: "title",
      right: "month,agendaWeek,agendaDay",
    },
    defaultView: "month",
    navLinks: true,
    editable: true,
    eventLimit: true,
    events: loadEvents(),
    eventClick: function(calEvent, jsEvent, view) {
      // Update the event title
      const newTitle = prompt("Edit event title:", calEvent.title);
      if (newTitle) {
        calEvent.title = newTitle;
        calendarContainer.fullCalendar("updateEvent", calEvent);
        updateEventLocalStorage(calEvent);
      } else if (newTitle === "") {
        // Delete the event from calendar
        calendarContainer.fullCalendar("removeEvents", calEvent._id);
        deleteEventLocalStorage(calEvent);
      }
    },
    // Handle event drag and drop
    eventDrop: function(event, delta, revertFunc) {
      updateEventLocalStorage(event);
    },
    eventResize: function(event, delta, revertFunc) {
      updateEventLocalStorage(event);
    },
    dayClick: function(date, jsEvent, view) {
      var eventTitle = prompt("Enter event title:");
      if (eventTitle) {
        var startTime = prompt("Enter start time (24-hour format, e.g., 13:30):");
        var endTime = prompt("Enter end time (24-hour format, e.g., 15:45):");
    
        if (startTime && endTime) {
          var startDateTime = date.format("YYYY-MM-DD") + "T" + startTime;
          var endDateTime = date.format("YYYY-MM-DD") + "T" + endTime;
    
          calendarContainer.fullCalendar("renderEvent", {
            title: eventTitle,
            start: startDateTime,
            end: endDateTime
          });

          saveEvent({
            title: eventTitle,
            start: startDateTime,
            end: endDateTime
          });
        }
      } else {
        alert("Please enter valid start and end times.");
      }
    }
  });

  return calendarContainer;
}

function saveEvent(eventData) {
  var events = JSON.parse(localStorage.getItem("monthlySchedulerEvents") || "[]");
  events.push(eventData);
  localStorage.setItem("monthlySchedulerEvents", JSON.stringify(events));
}

function loadEvents() {
  return JSON.parse(localStorage.getItem("monthlySchedulerEvents") || "[]");
}

function updateEventLocalStorage(eventData) {
  var events = JSON.parse(localStorage.getItem("monthlySchedulerEvents") || "[]");
  var updatedEvents = events.map(function (event) {
    if (event.start === eventData.start && event.end === eventData.end && event.title === eventData.title) {
      return eventData;
    } else {
      return event;
    }
  });
  localStorage.setItem("monthlySchedulerEvents", JSON.stringify(updatedEvents));
}

function deleteEventLocalStorage(eventData) {
  var events = JSON.parse(localStorage.getItem("monthlySchedulerEvents") || "[]");
  var updatedEvents = events.filter(function (event) {
    return !(event.start === eventData.start && event.end === eventData.end && event.title === eventData.title);
  });
  localStorage.setItem("monthlySchedulerEvents", JSON.stringify(updatedEvents));
}

$(document).ready(function () {
  $("#scheduleForm").on("submit", async function (event) {
    event.preventDefault();

    const data = $(this).serializeArray().reduce((obj, item) => {
      obj[item.name] = item.value;
      return obj;
    }, {});
    const userPrompt = data.userPrompt;

    const scheduleLines = await fetchSchedule(userPrompt);
     // Add this line to log the raw API response
    console.log("Raw API Response:", scheduleLines);
    const cleanedResponse = cleanApiResponse(scheduleLines);
    const parsedEvents = parseSchedule(cleanedResponse);

    calendarContainer.fullCalendar('addEventSource', parsedEvents);
    calendarContainer.fullCalendar('refetchEvents');
  });

  let calendarContainer = generateMonthView("#calendarContainer");

  $("#currentDay").text("Today is: " + moment().format("dddd, MMMM Do, YYYY"));

  // Save events to local storage when save button is clicked
  $(".saveBtn").on("click", function () {
    var hour = $(this).data("hour");
    var plannerText = $("#hour-" + hour).val();
    localStorage.setItem("hour-" + hour, plannerText);
  });

  $("#resetBtn").on("click", function() {
    // Reset day view entries
    $("textarea").val("");
    calendarContainer.fullCalendar("removeEvents");

    // Clear localStorage for day view entries
    calendarContainer.fullCalendar("removeEvents");
    localStorage.removeItem("monthlySchedulerEvents");
  });
});

$(document).ready(function () {
  $("#scheduleForm").on("submit", async function (event) {
    event.preventDefault();
    // disable the generate schedule button and provide a visual feedback like changing the button text
    let generateScheduleBtn = document.getElementById('generateScheduleBtn');
    generateScheduleBtn.disabled = true;
    generateScheduleBtn.textContent = "Generating Schedule...";

    const data = $(this).serializeArray().reduce((obj, item) => {
      obj[item.name] = item.value;
      return obj;
    }, {});
    const userPrompt = data.userPrompt;

    const scheduleLines = await fetchSchedule(userPrompt);
     // Add this line to log the raw API response
    console.log("Raw API Response:", scheduleLines);
    const cleanedResponse = cleanApiResponse(scheduleLines);
    const parsedEvents = parseSchedule(cleanedResponse);

    calendarContainer.fullCalendar('addEventSource', parsedEvents);
    calendarContainer.fullCalendar('refetchEvents');

    // enable the generate schedule button again and change the text back to original
    generateScheduleBtn.disabled = false;
    generateScheduleBtn.textContent = "Generate Schedule";
  });
});