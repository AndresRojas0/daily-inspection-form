# Daily work app

Aplicación en V0 para llevar registro de actividad laboral.

Prompt inicial:
```
Hey there. Can you make a web mobile first for register my daily work? The data structure I use is shown below.
{
  dailyInspectionForm: {
    // Form header information
    formHeader: {
      title: "DAILY INSPECTION FORM",
      inspectorName: "string",
      date: "YYYY-MM-DD", // Date of the day
      placeOfWork: "string" // City or address
    },
    
    // List of service inspections
    serviceChecks: [
      {
        lineOrRouteNumber: "string", // Route identifier
        driverName: "string",
        serviceCode: "string", // Service identifier
        fleetCoachNumber: "string", // Vehicle number
        exactHourOfArrival: "HH:MM:SS", // Time format
        gpsStatus: {
          minutes: "number", // Positive for late, negative for early
          status: "string" // "on-time", "ahead", "late"
        },
        passengersOnBoard: "number",
        passesUsed: "number",
        addressOfStop: "string",
        observations: "string" // Optional field
      }
    ]
  }
}

GPS status criteria: negative = late (yellow color), positive = early (from 2 onwards, red color), 0 = on-time (between 0 and 1min 59sec, green color)
```

Prompt agregar funcionalidad para subir documento .xlsx:
```
Please, add a function to upload an .xlsx document with the spreadsheet fields: Apellido, Día, Lugar, Sentido, Línea, Conductor, Servicio, Coche, Hora, GPS, Pasajeros, Pases, Parada, Observación; and fill automatically all the daily form in their respective attributes: Inspector Name, Date, Place of Work; and for every Service Inspection: Route Number, Service Code, Driver Name, Fleet Coach Number, Arrival Time, GPS Variance, Passengers on Board, Passes Used, Address of Stop, Observations. 

Apellido, Día, Lugar, Sentido, are rows in the xlsx document. 
Línea, Conductor, Servicio, Coche, Hora, GPS, Pasajeros, Pases, Parada, Observación, are columns in the xlsx document.

Please admit lowercase and uppercase indistinctly.
```

Prompt agregar funcionalidad para visualizar planillas guardadas:
```
Add a calendar to visualize saved forms in every day. 
In Recent Inspections Forms add a Delete functionality for a selectd form. 
In Recent Inspections Forms, in View Details, add Observations attribute, if it empty show "None".
```

Prompt reconocer diferentes formatos de entrada de datos para completar atributo GPS Variance: 
```
GPS Variance attribute have the format mm:ss. If the xlsx document uploaded have Gps field in +mm, -mm, +mm:ss, -mm:ss, (+mm:ss), (-mm:ss), convert it to fill the GPS Variance. 
Examples: +02:30 → 2 minutes 30 seconds early, -01:45 → 1 minute 45 seconds late.
```

Prompt agregar funcionalidad para setear non-compliance: 
```
Add a checkbox of non-compliance in the Observations attribute, and call it "Informe de Infracción". If the service have non-compliance, turn all the Service Check into red background. Under Service Inspections, add a counter for services checks recorded with non-compliance. 
If the xlsx document uploaded have Observación field with a word "INFORME" or "Informe" or "informe", check the non-compliance box in their respective services.
```

# Daily work app

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/andresgustavorojas0-5269s-projects/v0-daily-work-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/RKODLeOesci)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/andresgustavorojas0-5269s-projects/v0-daily-work-app](https://vercel.com/andresgustavorojas0-5269s-projects/v0-daily-work-app)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/RKODLeOesci](https://v0.dev/chat/projects/RKODLeOesci)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
