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
		.then(response => response.json())
		.then(result => {
			if (result.result) {
				parseQueryResults(result.result);
			} else {
				return alert(result.error);
			}
		})
		.catch(error => alert(error));


	/**
	 * Returns an HTML table row representing a dataset as a string
	 * @param dataset
	 * @returns {string}
	 */
	function createTableRow(dataset) {
		let tableString = '<tr>'
		for (let key in dataset) {
			tableString += createTableCell(dataset[key]);
		}
		tableString += '</tr>'
		return tableString;
	}

	/**
	 * Returns an HTML table cell representing a dataset as a string
	 * @param content
	 * @returns {string}
	 */
	function createTableCell(content) {
		return '<td>' + content + '</td>'
	}

// Creates a JSON table for the queryDataset results
	function parseQueryResults(insightResults) {
		let table = document.getElementById("queryTable");
		let tableContentString = "<tr>\n" +
			"\t\t<th>Year</th>\n" +
			"\t\t<th>Department Average</th>\n" +
			"\t</tr>";
		for (const dataset of insightResults) {
			tableContentString += createTableRow(dataset);
		}
		table.innerHTML = tableContentString;
	}
};
