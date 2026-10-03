class TicketpingTokensController < ApplicationController
  before_action :authenticate_user!

  def create
    claims = {
      sub: current_user.id.to_s,
      email: current_user.email.presence,
      name: current_user.name.presence,
      exp: Time.now.to_i + 300
    }.compact

    token = JWT.encode(claims, ENV.fetch("TICKETPING_IDENTITY_SECRET"), "HS256")
    render plain: token
  end
end
