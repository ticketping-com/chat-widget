Rails.application.routes.draw do
  post "/api/ticketping-token", to: "ticketping_tokens#create"
end
