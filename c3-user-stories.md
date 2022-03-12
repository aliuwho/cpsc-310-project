## User Story 1
As a user, I want to be able to view information about the datasets in the system, so that I can access and understand a valid dataset for my queries.


#### Definitions of Done(s)
Scenario 1: Happy Path
Given: The user is on the main page
When: The user clicks the "View Datasets" button
Then: The names, kinds, and number of rows of the datasets should be displayed in a table format

Scenario 2: API calls fail
Given: The user is on the main page
When: The InsightFacade API fails (timeout, network connections, etc)
Then: An error message will be displayed with some description of the problem


## User Story 2
As a professor, I want to be able to check my course averages from a given year to the current year, so that I can gauge the effectiveness of my teaching over the years.

#### Definitions of Done(s)
Scenario 1: Valid query
Given: The professor is on the query page
When: The user has a valid typed query in the text box and clicks the “Submit Query” button
Then: The corresponding results will be displayed in a table format in the results area of the page.

Scenario 2: Invalid query
Given: The professor is on the query page
When: The user has an invalid typed query in the text box and clicks the “Submit Query” button
Then: The corresponding error will be displayed as text with some description of what went wrong in the results area of the page.
