// Send POST request
document.getElementById("submitPostRequest").onclick = function () {
	const queryId = document.getElementById("queryIdInput").value;
	const queryYear = parseInt(document.getElementById("queryYearInput").value);
	const queryDept = document.getElementById("queryDeptInput").value;
	const data = {
		"WHERE": {
			"AND": [
				{
					"IS": {}
				},
				{
					"GT": {}
				}
			]
		},
		"OPTIONS": {},
		"TRANSFORMATIONS": {
			"APPLY": [
				{
					"overallAvg": {}
				}
			]
		}
	}

	data["WHERE"]["AND"][0]["IS"][queryId + "_dept"] = queryDept;
	data["WHERE"]["AND"][1]["GT"][queryId + "_year"] = queryYear;
	data["OPTIONS"]["COLUMNS"] = [queryId + "_year", "overallAvg"];
	data["TRANSFORMATIONS"]["GROUP"] = [queryId + "_year"];
	data["TRANSFORMATIONS"]["APPLY"][0]["overallAvg"]["AVG"] = queryId + "_avg";


	// Request Option documentation: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
	const requestOptions = {
		method: 'POST',
		redirect: 'follow',
		headers: {
			'Content-Type':  'application/json'
		},
		body: JSON.stringify(data)
	};
	fetch("http://localhost:4321/query", requestOptions)
		.then(response => response.text())
		.then(result => document.getElementById("queryResult").innerText = result.toString())
		.catch(error => alert(error));

	// TODO improve output of success or error
	// TODO change front-end for kind input to only have "courses" / "rooms"
	//
};
