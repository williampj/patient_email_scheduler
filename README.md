# Email Scheduler

## Description

This email scheduling program schedules automated emails to patients based on the contents of a `patients.csv` file.

It parses the `patients.csv` file and loads all patient records into a MongdoDB database named `patientsDatabase` under a `Patients` collection.

It then proceeds to schedule four emails over four consecutive days to each patient with a disclosed email address who has consented to receive emails. These emails are built are created and sent using the `nodemailer` library and scheduled for future dates using the `node-schedule` library.
Once the emails have been scheduled, they are inserted into an `Emails` collection in the same `patientsDatabase`.

## Development process

See the `steps.md` file for documentation on the steps taken to build the Email Scheduler.

## Prerequisites

To run the program, the user must have MongoDB installed locally.

## Running the program

To run the program, run the following command:
`npm run start`

To access the `Patients` and `Emails` collections, connect to the local MongoDB instance at following URI: `mongodb://localhost:27017/`, the database `PatientsDatabase`, and run `find` queries on the `Patients` and `Emails` collections. There should be 18 patients and 28 emails based on the default `patients.csv` file.

### Reset the database

To reset the database, run the following command:

`npm run reset`

## Testing the program

To run the testing suite, run the following command:

`npm run test`
