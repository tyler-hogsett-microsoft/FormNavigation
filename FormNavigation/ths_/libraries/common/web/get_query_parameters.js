window.Common = window.Common || {};
Common.Web = Common.Web || {};

/**
 * @function getQueryParameters
 * @description Retrieves the query parameters passed to the current page.
 * @returns {string}
 */
Common.Web.getQueryParameters = function () {
    if (location.search == "") {
        return {};
    }
    var returnObject = {};
    var parameters = location.search.substr(1).split("&");
    for(var i = 0; i < parameters.length; i++) {
        var parameter = parameters[i].replace(/\+/g, " ");
        var parts = parameter.split("=");
        var key = parts[0];
        var value = decodeURIComponent(parts[1]);
        returnObject[key] = value;
    }
    return returnObject;
};