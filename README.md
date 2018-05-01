# userMS
This microservice performs the following functionalities

/adduser

POST
username
email
password

Description
Register new user account
Username and email must be unique
Should send email with verification key

Returns:
status: “OK” or “error”
error: error message (if error)


/login

POST
username
password

Description
Login to account
Sets session cookie

Returns:
status: “OK” or “error”
error: error message (if error)



/verify
POST
email
key: verification key

Decrription
Verifies account
Account cannot be used until account is verified

Returns:
status: “OK” or “error”
error: error message (if error)


Written with NodeJS check Package.json for dependencies
# superuser
