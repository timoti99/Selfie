import dayjs from "dayjs";

export function getMonth(month = dayjs().month()) {
 //input: 0-11; default value is the present month
    month = Math.floor(month)
    const year = dayjs().year();
    const firstDayOfMonth = dayjs(new Date(year, month, 1)).day()
    //will create a new Datejs object with the current year, the given month and the first day 
    let currentMonthCount = 0 - firstDayOfMonth;
    //const daysMatrix = new Array(5).fill([])
    //=> this will be populated with 7 days for each row
    const daysMatrix = new Array(5).fill([]).map(() => {
        return new Array(7).fill(null).map(() => {
            currentMonthCount++
            return dayjs(new Date(year, month, currentMonthCount))
        })
    })
    return daysMatrix
}