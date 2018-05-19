var isOpen = {};

function toggleBookSeries(name)
{
	if(isOpen[name])
	{
		$("#series-" + name).slideUp();
		$("#book-view-" + name).text("(view)");
	}
	else
	{
		$("#series-" + name).slideDown();
		$("#book-view-" + name).text("(hide)");
	}

	isOpen[name] = !isOpen[name];
}