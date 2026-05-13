@protocol: 'rest'
@path    : '/getOrigenTD'
service getOrigenTD {
    @open
    type object {};

    action getData17(input: object) returns object;
  
}