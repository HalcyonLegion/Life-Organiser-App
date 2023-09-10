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

  for (let event of scheduleArray) {
    // check if event.start and event.end are undefined
    if (!event.start || !event.end) {
      console.error('start and end timestamps of the event are undefined.', event);
      continue;
    }

    // create JavaScript Date objects
    const startDateTime = new Date(event.start);
    const endDateTime = new Date(event.end);

    // check if the Date objects created are valid
    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      console.error('Invalid start or end timestamp for event.', event);
      continue;
    }

    parsedEvents.push({
      start: startDateTime,
      end: endDateTime,
      title: event.title
    });
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
// eventDrop function:
eventDrop: function(event, delta, revertFunc) {
  // event.start and event.end are moment instances, convert them to string
  event.start = event.start.format("YYYY-MM-DDTHH:mm:ss");
event.end = event.end ? event.end.format("YYYY-MM-DDTHH:mm:ss") : null;
  updateEventLocalStorage(event);
},

// eventResize function:
eventResize: function(event, delta, revertFunc) {
  // event.start and event.end are moment instances, convert them to string
  event.start = event.start.format("YYYY-MM-DDTHH:mm:ss");
  event.end = event.end.format("YYYY-MM-DDTHH:mm:ss");
  updateEventLocalStorage(event);
},
    dayClick: function(date, jsEvent, view) {
      var eventTitle = prompt("Enter event title:");
      if (eventTitle) {
        var startTime = prompt("Enter start time (24-hour format, e.g., 13:30):");
        var endTime = prompt("Enter end time (24-hour format, e.g., 15:45):");
    
        if (startTime && endTime) {
          var startDateTime = date.format("YYYY-MM-DD") + "T" + startTime + ":00"; 
          var endDateTime = date.format("YYYY-MM-DD") + "T" + endTime + ":00";
    
          calendarContainer.fullCalendar("renderEvent", {
            title: eventTitle,
            start: startDateTime,
            end: endDateTime
          });

          var newEvent = {
            title: eventTitle,
            start: startDateTime,
            end: endDateTime
          };
          calendarContainer.fullCalendar("renderEvent", newEvent);
          // ...then save it to local storage.
          saveEvent(newEvent);
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

  // Check and reformat the eventData to correct ISO string format
  const start = moment(eventData.start).isValid() ? moment(eventData.start).format('YYYY-MM-DDTHH:mm:ss') : moment().format('YYYY-MM-DDTHH:mm:ss');
  const end = moment(eventData.end).isValid() ? moment(eventData.end).format('YYYY-MM-DDTHH:mm:ss') : moment().format('YYYY-MM-DDTHH:mm:ss');
  
  // Create the new event format
  let newEvent = {
    title: eventData.title,
    start: start,
    end: end
  };

  // Push the updated eventData to events array
  events.push(newEvent);

  // Save it into the local storage.
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
  let calendarContainer = generateMonthView("#calendarContainer");

  $("#currentDay").text("Today is: " + moment().format("dddd, MMMM Do, YYYY"));

  // Save events to local storage when save button is clicked
  $("#saveToLocalStorage").on('click', function() {
    const events = calendarContainer.fullCalendar('clientEvents');
    let storedEvents = [];
    events.forEach((event) => {
      // Transform the dates into correct format 
      let start = moment(event.start).toISOString();
      let end = (event.end) ? moment(event.end).toISOString() : start;
      // Add an if condition checking if `event.end` exists because a single day event may not contain an end value
      
      // Create new style event
      let newEvent = {
        title: event.title,
        start: start,
        end: end
      };
      // Push the event data to array
      storedEvents.push(newEvent);
    });
    // Save events into the local storage
    localStorage.setItem("monthlySchedulerEvents", JSON.stringify(storedEvents));
    console.log("Events saved to Local Storage:", JSON.parse(localStorage.getItem("monthlySchedulerEvents")));
  });

  $("#resetBtn").on("click", function() {
    // Reset day view entries
    $("textarea").val("");
    calendarContainer.fullCalendar("removeEvents");

    // Clear localStorage for day view entries
    calendarContainer.fullCalendar("removeEvents");
    localStorage.removeItem("monthlySchedulerEvents");
  });

  $("#scheduleForm").on("submit", async function (event) {
    event.preventDefault();
    // disable the generate schedule button and provide a visual feedback like changing the button text
    let generateScheduleBtn = document.getElementById('generateScheduleBtn');
    generateScheduleBtn.disabled = true;
    generateScheduleBtn.textContent = "Generating Schedule...";

    // change the mouse cursor to a loading spinner
    document.body.style.cursor = 'wait';
  
    try {
      const data = $(this).serializeArray().reduce((obj, item) => {
        obj[item.name] = item.value;
        return obj;
      }, {});
      const userPrompt = data.userPrompt;
    
      const scheduleLines = await fetchSchedule(userPrompt);
      const cleanedResponse = cleanApiResponse(scheduleLines);
      const parsedEvents = parseSchedule(cleanedResponse);
    
      calendarContainer.fullCalendar('addEventSource', parsedEvents);
      calendarContainer.fullCalendar('refetchEvents');
    } catch (error) {
      console.error("Error:", error);
      document.getElementById("errorMessage").style.display = "block";
      document.getElementById("errorMessage").innerText = "An error occurred during the process: " + error.message;  
    } finally {
      // enable the generate schedule button again and change the text back to original
      generateScheduleBtn.disabled = false;
      generateScheduleBtn.textContent = "Generate Schedule";
    
      // change the mouse cursor back to default
      document.body.style.cursor = 'default';
    }
  });
});

$("#exportToIcs").on('click', function() {
  const events = JSON.parse(localStorage.getItem("monthlySchedulerEvents") || "[]");

  if (!events.length) {
    console.log('No events to export.');
    return;
  }

  if (ics !== undefined) {
    const cal = ics();
    if (cal !== undefined) {
      events.forEach(event => {
        
        // Perform check for valid ISO format string or convert it to valid ISO format
        const start = moment(event.start).isValid() ? moment(event.start).toISOString() : moment().format();
        const end = moment(event.end).isValid() ? moment(event.end).toISOString() : moment().format();
        const title = event.title;

        cal.addEvent(title, '', '', start, end);
      });

      cal.download('my_schedule');
      console.log("ICS file has been created and triggered to download.");
    }
  }
});