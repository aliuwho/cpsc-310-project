## User Story 1
As an academic administrator, I want to remove a dataset, so that I can get rid of datasets that are not useful or are outdated and save storage space.


#### Definitions of Done(s)
Scenario 1: Valid Dataset
Given: The user is on the main page
When: The user enters a dataset that is in the system and clicks the "Remove Dataset" button
Then: A success message including the name of the dataset should be displayed. Any consecutive queries on the removed dataset should not be successful.

Scenario 2: Invalid Dataset
Given: The user is on the main page
When: The user enters a dataset that is not in the system and clicks the "Remove Dataset" button
Then: An error message will be displayed with some description of the problem.


## User Story 2
As the dean of a department, I want to be able to check the course averages in a dataset for my department from a given year to the current year, so that I can gauge the effectiveness of professors’ teaching over the years.

#### Definitions of Done(s)
Scenario 1: Valid Dataset ID
Given: The dean is on the query page
When: The user enters a valid dataset id, starting year, and a course dept and clicks the “Submit Query” button
Then: The corresponding result (averages of all the courses in the department for every relevant year) will be displayed in the results area of the page.

Scenario 2: Valid Dataset ID
Given: The dean is on the query page
When: The user enters an invalid dataset id, starting year, and a course dept and clicks the “Submit Query” button
Then: The corresponding error will be displayed as text with some description of the error.

